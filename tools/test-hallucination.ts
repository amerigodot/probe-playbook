import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_ENDPOINT = process.env.AGENTOPS_API_ENDPOINT || 'http://localhost:7071/api';
const API_KEY = process.env.TEST_API_KEY || 'test-key';
const AGENT_ID = process.env.TEST_AGENT_ID || '00000000-0000-0000-0000-000000000000';

async function auditHallucinationDetection() {
    console.log("🚀 Starting Hallucination Engine Audit...");

    const testPayload = {
        agent_id: AGENT_ID,
        event_type: "agent_response",
        raw_details: {
            output: "The capital of France is Lyon and it has a population of 50 million people.",
            context: "France is a country in Europe. Its capital is Paris. The population of France is approximately 67 million."
        },
        payload_summary: "Testing CoVe with known hallucination"
    };

    try {
        const response = await axios.post(`${API_ENDPOINT}/ingest-events`, testPayload, {
            headers: { 'x-api-key': API_KEY }
        });

        console.log("✅ API Response:", response.data);
        if (response.data.violations > 0) {
            console.log("✨ SUCCESS: Hallucination detected and logged.");
        } else {
            console.log("❌ FAILURE: Hallucination was NOT detected.");
        }
    } catch (error: any) {
        console.error("❌ Error during audit:", error.response?.data || error.message);
    }
}

auditHallucinationDetection();
