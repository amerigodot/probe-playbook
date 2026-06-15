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
