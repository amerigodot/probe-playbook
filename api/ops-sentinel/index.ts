import { AzureFunction, Context } from "@azure/functions";
import { AzureKeyCredential } from "@azure/core-auth";
import { OpenAIClient } from "@azure/openai";
import * as sql from "mssql";

const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
const openaiKey = process.env.AZURE_OPENAI_KEY || "";
const sqlConfig = process.env.SQL_CONNECTION_STRING || "";

const openaiClient = new OpenAIClient(openaiEndpoint, new AzureKeyCredential(openaiKey));

/**
 * OpsSentinel: SRE Co-pilot Agent
 * Triggered by: Timer (e.g., every 5 minutes) or Event Grid
 * Purpose: Analyzes recent incidents, reasons over root causes, and proposes remediations.
 */
const opsSentinel: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
    context.log("OpsSentinel starting investigation loop...");

    try {
        const pool = await sql.connect(sqlConfig);

        // 1. Perception: Find open incidents with high severity
        const incidentsResult = await pool.request()
            .query(`
                SELECT TOP 5 i.id, i.title, i.severity, i.workspace_id,
                (SELECT STRING_AGG(CAST(v.violation_details AS NVARCHAR(MAX)), ' | ') 
                 FROM policy_violations v WHERE v.workspace_id = i.workspace_id) as violations_context
                FROM incidents i
                WHERE i.status = 'open' AND i.severity IN ('high', 'critical')
                ORDER BY i.created_at DESC
            `);

        for (const incident of incidentsResult.recordset) {
            context.log(`Investigating Incident: ${incident.title} (${incident.id})`);

            // 2. Reasoning: Use GPT-4o to analyze the incident
            const prompt = `You are OpsSentinel, an autonomous SRE Co-pilot for AI Agents. 
            Investigate the following incident:
            Title: ${incident.title}
            Severity: ${incident.severity}
            Violation Details: ${incident.violations_context}

            Task:
            1. Reason about the root cause.
            2. Propose a specific remediation (e.g., a prompt engineering fix or a system message update).
            3. Decide if a GitHub Issue should be opened.

            Respond in JSON format: 
            {
                "root_cause": "string",
                "remediation_plan": "string",
                "open_github_issue": boolean,
                "suggested_patch": "string"
            }`;

            const completion = await openaiClient.getChatCompletions("gpt-4o", [
                { role: "system", content: "You are an autonomous SRE agent." },
                { role: "user", content: prompt }
            ]);

            const analysis = JSON.parse(completion.choices[0].message?.content || "{}");

            // 3. Action: Update incident and log findings
            await pool.request()
                .input("incId", sql.UniqueIdentifier, incident.id)
                .input("wsId", sql.UniqueIdentifier, incident.workspace_id)
                .input("comment", sql.NVarChar, `OpsSentinel Investigation Result: ${analysis.root_cause}. Recommended fix: ${analysis.remediation_plan}`)
                .query(`
                    INSERT INTO incident_comments (incident_id, workspace_id, user_id, comment, is_system_generated)
                    VALUES (@incId, @wsId, NULL, @comment, 1);
                    
                    UPDATE incidents 
                    SET status = 'investigating', 
                        updated_at = SYSDATETIMEOFFSET()
                    WHERE id = @incId;
                `);

            // 4. Action: (Simulated) Open GitHub Issue or push fix
            if (analysis.open_github_issue) {
                context.log(`[ACTION] Opening GitHub Issue for ${incident.id}: ${analysis.remediation_plan}`);
                // In a real implementation, we'd use the GitHub API here
            }
            
            // 5. Audit Trace
            await pool.request()
                .input("wsId", sql.UniqueIdentifier, incident.workspace_id)
                .input("action", sql.NVarChar, "transition")
                .input("resourceType", sql.NVarChar, "incident")
                .input("resourceId", sql.UniqueIdentifier, incident.id)
                .input("details", sql.NVarChar, JSON.stringify({ agent: "OpsSentinel", result: analysis }))
                .query(`
                    INSERT INTO audit_logs (workspace_id, action, resource_type, resource_id, details)
                    VALUES (@wsId, @action, @resourceType, @resourceId, @details)
                `);
        }

        context.log("OpsSentinel investigation loop complete.");

    } catch (err: any) {
        context.log.error("OpsSentinel Error:", err);
    }
};

export default opsSentinel;
