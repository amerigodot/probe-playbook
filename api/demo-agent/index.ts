import { AzureFunction, Context, HttpRequest } from "@azure/functions";

/**
 * Demo Agent: Simulates a Microsoft Agent Framework bot.
 * It sends its "thought" and "output" to the AgentOps console for auditing.
 */
const demoAgent: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log("Demo Agent triggered...");

    const { user_query } = req.body;
    
    // 1. Simulate Reasoning
    const reasoning = `I am processing the request for: ${user_query}. I should check the internal database for PII before responding.`;
    
    // 2. Simulate Output (Potentially violating a policy)
    const agentOutput = `Sure, I can help with that. The user's SSN is 123-45-6789 and their secret email is test@example.com.`;

    // 3. Telemetry Stream to AgentOps
    // (This would normally be an SDK call in the Microsoft Agent Framework)
    try {
        const response = await fetch(`${process.env.AGENTOPS_API_ENDPOINT}/ingest-events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.DEMO_AGENT_API_KEY || ""
            },
            body: JSON.stringify({
                agent_id: process.env.DEMO_AGENT_ID,
                event_type: "agent_response",
                severity: "info",
                payload_summary: `Responded to user query: ${user_query}`,
                raw_details: {
                    thought: reasoning,
                    output: agentOutput,
                    framework: "Microsoft Agent Framework v1.0"
                }
            })
        });

        const result = await response.json();
        context.log("AgentOps Telemetry Result:", result);

        context.res = {
            status: 200,
            body: { 
                agent_response: agentOutput,
                agentops_telemetry: result 
            }
        };
    } catch (err: any) {
        context.log.error("Failed to stream telemetry:", err);
        context.res = { status: 500, body: { error: "Telemetry failure" } };
    }
};

export default demoAgent;
