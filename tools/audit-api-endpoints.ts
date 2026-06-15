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
const TEST_BEARER_TOKEN = process.env.TEST_BEARER_TOKEN || 'fake-token';

async function auditApiEndpoints() {
    console.log("🚀 Starting Azure-Native API Endpoint Audit...");

    const entities = ['agents', 'policies', 'incidents', 'audit_logs'];

    for (const entity of entities) {
        console.log(`🔍 Testing GET /data-service?entity=${entity}...`);
        try {
            const response = await axios.get(`${API_ENDPOINT}/data-service`, {
                params: { entity },
                headers: { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
            });

            console.log(`✅ ${entity} Response:`, Array.isArray(response.data) ? `${response.data.length} items found` : 'Object found');
        } catch (error: any) {
            if (error.response?.status === 401) {
                console.log(`⚠️ Expected 401 for invalid token (Security test passed)`);
            } else {
                console.error(`❌ Error testing ${entity}:`, error.response?.data || error.message);
            }
        }
    }

    console.log("✨ API Audit Complete.");
}

auditApiEndpoints();
