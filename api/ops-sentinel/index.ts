/*
 * Copyright 2026 Amerigo Di Maria
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AzureFunction, Context } from "@azure/functions";
import { AzureKeyCredential } from "@azure/core-auth";
import { OpenAIClient } from "@azure/openai";
import { Octokit } from "@octokit/rest";
import { MachineLearningManagementClient } from "@azure/arm-machinelearning";
import { DefaultAzureCredential } from "@azure/identity";
import * as sql from "mssql";

const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
const openaiKey = process.env.AZURE_OPENAI_KEY || "";
const sqlConfig = process.env.SQL_CONNECTION_STRING || "";
const githubToken = process.env.GITHUB_TOKEN || "";
const githubRepoOwner = process.env.GITHUB_REPO_OWNER || "";
const githubRepoName = process.env.GITHUB_REPO_NAME || "";

// Azure ML variables for Quarantine feature
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID || "";
const resourceGroupName = process.env.AZURE_RESOURCE_GROUP || "";
const workspaceName = process.env.AZURE_ML_WORKSPACE || "";

const openaiClient = new OpenAIClient(openaiEndpoint, new AzureKeyCredential(openaiKey));
const octokit = new Octokit({ auth: githubToken });

/**
 * Helper to disable an Azure AI Foundry deployment (Quarantine)
 */
async function quarantineDeployment(context: Context, deploymentName: string, endpointName: string): Promise<boolean> {
    if (!subscriptionId || !resourceGroupName || !workspaceName) {
        context.log.warn("Azure ML config missing. Skipping quarantine.");
        return false;
    }

    try {
        const credential = new DefaultAzureCredential();
        const client = new MachineLearningManagementClient(credential, subscriptionId);

        context.log(`Quarantining deployment ${deploymentName} on endpoint ${endpointName}...`);
        
        // 1. Get current endpoint to verify
        const endpoint = await client.onlineEndpoints.get(resourceGroupName, workspaceName, endpointName);
        
        // 2. Update traffic to route 0% to the violating deployment
        const trafficUpdate = { ...endpoint.traffic };
        if (trafficUpdate && trafficUpdate[deploymentName] !== undefined) {
             trafficUpdate[deploymentName] = 0;
        }

        await client.onlineEndpoints.beginUpdateAndWait(resourceGroupName, workspaceName, endpointName, {
            traffic: trafficUpdate
        });

        context.log(`Quarantine successful for ${deploymentName}.`);
        return true;
    } catch (error) {
        context.log.error("Failed to quarantine deployment:", error);
        return false;
    }
}

/**
 * Helper to create a GitHub PR with the suggested patch
 */
async function createRemediationPR(context: Context, incidentId: string, suggestedPatch: string, fileToPatch: string = "agent-prompts.json") {
    try {
        if (!githubToken || !githubRepoOwner || !githubRepoName) {
            context.log.warn("GitHub integration missing configuration. Skipping PR creation.");
            return null;
        }

        const branchName = `ops-sentinel/fix-${incidentId.substring(0, 8)}`;
        
        // 1. Get the latest commit SHA of the main branch
        const { data: refData } = await octokit.git.getRef({
            owner: githubRepoOwner,
            repo: githubRepoName,
            ref: "heads/main",
        });
        const baseSha = refData.object.sha;

        // 2. Create a new branch
        await octokit.git.createRef({
            owner: githubRepoOwner,
            repo: githubRepoName,
            ref: `refs/heads/${branchName}`,
            sha: baseSha,
        });

        // 3. Get the current file content (Simulating a known prompt file)
        let currentContent = "";
        let fileSha = "";
        try {
            const { data: fileData } = await octokit.repos.getContent({
                owner: githubRepoOwner,
                repo: githubRepoName,
                path: fileToPatch,
                ref: branchName,
            });
            if (!Array.isArray(fileData) && fileData.type === 'file') {
                currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
                fileSha = fileData.sha;
            }
        } catch (e) {
            context.log("Target file does not exist, creating new one.");
        }

        // 4. Update the file (For demo, we append the patch or replace if JSON)
        const newContent = currentContent 
            ? `${currentContent}\n\n// OpsSentinel Patch applied:\n${suggestedPatch}`
            : suggestedPatch;

        await octokit.repos.createOrUpdateFileContents({
            owner: githubRepoOwner,
            repo: githubRepoName,
            path: fileToPatch,
            message: `OpsSentinel: Automated remediation for incident ${incidentId}`,
            content: Buffer.from(newContent).toString('base64'),
            sha: fileSha || undefined,
            branch: branchName,
        });

        // 5. Create Pull Request
        const { data: prData } = await octokit.pulls.create({
            owner: githubRepoOwner,
            repo: githubRepoName,
            title: `[OpsSentinel] Automated Remediation for Incident ${incidentId}`,
            head: branchName,
            base: "main",
            body: `🤖 **OpsSentinel Automated Remediation**\n\nThis PR was generated automatically to resolve policy violations associated with Incident \`${incidentId}\`.\n\n**Suggested Patch:**\n\`\`\`\n${suggestedPatch}\n\`\`\`\n\nPlease review the changes before merging.`,
        });

        return prData.html_url;

    } catch (error) {
        context.log.error("Failed to create GitHub PR:", error);
        return null;
    }
}

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
            3. Decide if a GitHub Issue or PR should be opened.
            4. Decide if the agent's behavior is dangerous enough to warrant an immediate "Quarantine" (disabling its Azure AI deployment).

            Respond in JSON format: 
            {
                "root_cause": "string",
                "remediation_plan": "string",
                "open_github_issue": boolean,
                "suggested_patch": "string",
                "requires_quarantine": boolean,
                "deployment_name": "string", 
                "endpoint_name": "string"
            }`;

            const completion = await openaiClient.getChatCompletions("gpt-4o", [
                { role: "system", content: "You are an autonomous SRE agent." },
                { role: "user", content: prompt }
            ]);

            const analysis = JSON.parse(completion.choices[0].message?.content || "{}");
            
            let prUrl = null;
            let quarantineStatus = false;

            // 3. Action: Quarantine if critical
            if (analysis.requires_quarantine && analysis.deployment_name && analysis.endpoint_name) {
                context.log(`[ACTION] Initiating Quarantine for incident ${incident.id}`);
                quarantineStatus = await quarantineDeployment(context, analysis.deployment_name, analysis.endpoint_name);
            }

            // 4. Action: Open GitHub PR
            if (analysis.open_github_issue && analysis.suggested_patch) {
                context.log(`[ACTION] Initiating GitHub PR for ${incident.id}`);
                prUrl = await createRemediationPR(context, incident.id, analysis.suggested_patch);
            }

            // 5. Update incident and log findings
            let finalComment = `OpsSentinel Investigation Result: ${analysis.root_cause}. Recommended fix: ${analysis.remediation_plan}.`;
            if (prUrl) finalComment += ` Created PR for remediation: ${prUrl}.`;
            if (quarantineStatus) finalComment += ` ⚠️ AGENT QUARANTINED due to critical safety violation.`;

            await pool.request()
                .input("incId", sql.UniqueIdentifier, incident.id)
                .input("wsId", sql.UniqueIdentifier, incident.workspace_id)
                .input("comment", sql.NVarChar, finalComment)
                .query(`
                    INSERT INTO incident_comments (incident_id, workspace_id, user_id, comment, is_system_generated)
                    VALUES (@incId, @wsId, NULL, @comment, 1);
                    
                    UPDATE incidents 
                    SET status = 'investigating', 
                        updated_at = SYSDATETIMEOFFSET()
                    WHERE id = @incId;
                `);
            
            // 6. Audit Trace (Refined Governance Trail)
            await pool.request()
                .input("wsId", sql.UniqueIdentifier, incident.workspace_id)
                .input("actorId", sql.NVarChar, "system.ops-sentinel")
                .input("actorType", sql.NVarChar, "system")
                .input("action", sql.NVarChar, "remediation")
                .input("decision", sql.NVarChar, quarantineStatus ? "quarantine" : "update")
                .input("resType", sql.NVarChar, "incident")
                .input("resId", sql.UniqueIdentifier, incident.id)
                .input("evidence", sql.NVarChar, JSON.stringify({ 
                    analysis: analysis, 
                    pr_url: prUrl, 
                    quarantined: quarantineStatus 
                }))
                .query(`
                    INSERT INTO audit_logs (workspace_id, actor_id, actor_type, action, decision, resource_type, resource_id, evidence)
                    VALUES (@wsId, @actorId, @actorType, @action, @decision, @resType, @resId, @evidence)
                `);
        }

        context.log("OpsSentinel investigation loop complete.");

    } catch (err: any) {
        context.log.error("OpsSentinel Error:", err);
    }
};

export default opsSentinel;
