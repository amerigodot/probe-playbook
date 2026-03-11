import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import ContentSafetyClient, { isUnexpected } from "@azure-rest/ai-content-safety";
import { AzureKeyCredential } from "@azure/core-auth";
import { OpenAIClient } from "@azure/openai";
import * as sql from "mssql";

const endpoint = process.env.AZURE_CONTENT_SAFETY_ENDPOINT || "";
const key = process.env.AZURE_CONTENT_SAFETY_KEY || "";
const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
const openaiKey = process.env.AZURE_OPENAI_KEY || "";
const sqlConfig = process.env.SQL_CONNECTION_STRING || "";

const contentSafetyClient = ContentSafetyClient(endpoint, new AzureKeyCredential(key));
const openaiClient = new OpenAIClient(openaiEndpoint, new AzureKeyCredential(openaiKey));

/**
 * Helper to perform Chain-of-Verification (CoVe) for hallucination detection
 */
async function performHallucinationCheck(context: Context, agentOutput: string, groundingContext: string): Promise<{ violation: boolean, reason: string }> {
    try {
        // Step 1: Extract Factual Claims
        const extractPrompt = `Extract all independent factual claims from the following agent output. 
        Output as a JSON array of strings.
        Output: "${agentOutput}"`;

        const extractRes = await openaiClient.getChatCompletions("gpt-4o", [
            { role: "system", content: "You are a factual claim extractor." },
            { role: "user", content: extractPrompt }
        ]);
        const claims: string[] = JSON.parse(extractRes.choices[0].message?.content || "[]");

        if (claims.length === 0) return { violation: false, reason: "No factual claims found." };

        // Step 2: Verify Claims against Context
        const verifyPrompt = `Verify the following claims against the provided grounding context. 
        Identify any claims that are NOT supported or are contradicted by the context.
        Grounding Context: "${groundingContext}"
        Claims: ${JSON.stringify(claims)}
        
        Respond in JSON: {"contradictions": [{"claim": "string", "reason": "string"}]}`;

        const verifyRes = await openaiClient.getChatCompletions("gpt-4o", [
            { role: "system", content: "You are a factual verification assistant." },
            { role: "user", content: verifyPrompt }
        ]);
        const verification = JSON.parse(verifyRes.choices[0].message?.content || "{}");

        if (verification.contradictions && verification.contradictions.length > 0) {
            return {
                violation: true,
                reason: `Hallucination detected in ${verification.contradictions.length} claims: ${verification.contradictions.map((c: any) => c.claim).join("; ")}`
            };
        }

        return { violation: false, reason: "All claims verified." };
    } catch (e) {
        context.log.error("Hallucination check failed:", e);
        return { violation: false, reason: "Check failed due to error." };
    }
}

const ingestEvents: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log("Processing ingest-events request...");

    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
        context.res = { status: 401, body: { error: "Missing x-api-key header" } };
        return;
    }

    try {
        const { agent_id, event_type, severity = "info", session_id, payload_summary, raw_details } = req.body;

        if (!agent_id || !event_type) {
            context.res = { status: 400, body: { error: "agent_id and event_type are required" } };
            return;
        }

        // 1. Database Connection & Tenant Isolation
        const pool = await sql.connect(sqlConfig);
        
        // Validate API Key and get Workspace ID
        // In a real Azure SQL setup, we'd use a stored procedure or RLS
        // For the hackathon, we simulate the workspace lookup
        const wsResult = await pool.request()
            .input("apiKey", sql.NVarChar, apiKey)
            .query("SELECT workspace_id FROM api_keys WHERE key_hash = @apiKey AND revoked_at IS NULL");

        if (wsResult.recordset.length === 0) {
            context.res = { status: 403, body: { error: "Invalid API key" } };
            return;
        }
        const workspaceId = wsResult.recordset[0].workspace_id;

        // Set RLS Session Context
        await pool.request().query(`EXEC sp_set_session_context 'workspace_id', '${workspaceId}'`);

        // 2. AI Content Safety (Enterprise PII/Moderation)
        const analyzeTextOptions = { text: JSON.stringify(raw_details) };
        const analyzeTextResponse = await contentSafetyClient.path("/text:analyze").post({
            body: analyzeTextOptions
        });

        if (isUnexpected(analyzeTextResponse)) {
            throw analyzeTextResponse.body.error;
        }

        const violations: any[] = [];
        const categories = analyzeTextResponse.body.categoriesAnalysis || [];
        for (const category of categories) {
            if (category.severity > 0) {
                violations.push({
                    type: "content_safety",
                    category: category.category,
                    severity: category.severity,
                    message: `Azure AI Content Safety flagged ${category.category} at severity ${category.severity}`
                });
            }
        }

        // 3. Semantic Policy Check (Azure OpenAI GPT-4o)
        // Load policies for this agent
        const policiesResult = await pool.request()
            .input("agentId", sql.UniqueIdentifier, agent_id)
            .query(`
                SELECT p.id, p.name, p.rule_config 
                FROM policies p 
                JOIN agent_policies ap ON p.id = ap.policy_id 
                WHERE ap.agent_id = @agentId
            `);

        for (const policy of policiesResult.recordset) {
            const ruleConfig = JSON.parse(policy.rule_config);
            
            // --- Semantic Rules ---
            if (ruleConfig.semantic_rules) {
                const prompt = `Evaluate the following agent event against this semantic policy: "${ruleConfig.semantic_rules}". 
                Event Payload: ${JSON.stringify(raw_details)}. 
                Respond in JSON format: {"violation": boolean, "reason": "string"}`;

                const completion = await openaiClient.getChatCompletions("gpt-4o", [
                    { role: "system", content: "You are an AI Governance Auditor." },
                    { role: "user", content: prompt }
                ]);

                const analysis = JSON.parse(completion.choices[0].message?.content || "{}");
                if (analysis.violation) {
                    violations.push({
                        policy_id: policy.id,
                        policy_name: policy.name,
                        type: "semantic_compliance",
                        message: analysis.reason
                    });
                }
            }

            // --- Hallucination Check ---
            if (ruleConfig.hallucination_check) {
                const agentOutput = raw_details.output || raw_details.response || payload_summary || "";
                const groundingContext = ruleConfig.grounding_context || "No context provided."; // Default or extracted from DB
                
                const result = await performHallucinationCheck(context, agentOutput, groundingContext);
                if (result.violation) {
                    violations.push({
                        policy_id: policy.id,
                        policy_name: policy.name,
                        type: "hallucination_detection",
                        message: result.reason
                    });
                }
            }
        }

        // 4. Persistence
        const eventResult = await pool.request()
            .input("wsId", sql.UniqueIdentifier, workspaceId)
            .input("agentId", sql.UniqueIdentifier, agent_id)
            .input("type", sql.NVarChar, event_type)
            .input("sev", sql.NVarChar, severity)
            .input("session", sql.NVarChar, session_id)
            .input("summary", sql.NVarChar, payload_summary)
            .input("details", sql.NVarChar, JSON.stringify(raw_details))
            .query(`
                INSERT INTO events (workspace_id, agent_id, event_type, severity, session_id, payload_summary, raw_details)
                OUTPUT INSERTED.id
                VALUES (@wsId, @agentId, @type, @sev, @session, @summary, @details)
            `);

        const eventId = eventResult.recordset[0].id;

        if (violations.length > 0) {
            for (const v of violations) {
                await pool.request()
                    .input("wsId", sql.UniqueIdentifier, workspaceId)
                    .input("policyId", sql.UniqueIdentifier, v.policy_id || null)
                    .input("agentId", sql.UniqueIdentifier, agent_id)
                    .input("eventId", sql.UniqueIdentifier, eventId)
                    .input("details", sql.NVarChar, JSON.stringify(v))
                    .input("sev", sql.NVarChar, "warning")
                    .query(`
                        INSERT INTO policy_violations (workspace_id, policy_id, agent_id, event_id, violation_details, severity)
                        VALUES (@wsId, @policyId, @agentId, @eventId, @details, @sev)
                    `);
            }
        }

        // 5. Audit Log
        await pool.request()
            .input("wsId", sql.UniqueIdentifier, workspaceId)
            .input("action", sql.NVarChar, "ingest")
            .input("resourceType", sql.NVarChar, "event")
            .input("resourceId", sql.UniqueIdentifier, eventId)
            .input("details", sql.NVarChar, JSON.stringify({ agent_id, violations_count: violations.length }))
            .query(`
                INSERT INTO audit_logs (workspace_id, action, resource_type, resource_id, details)
                VALUES (@wsId, @action, @resourceType, @resourceId, @details)
            `);

        context.res = {
            status: 200,
            body: { success: true, event_id: eventId, violations: violations.length }
        };

    } catch (err: any) {
        context.log.error("Error in ingest-events:", err);
        context.res = { status: 500, body: { error: "Internal server error", detail: err.message } };
    }
};

export default ingestEvents;
