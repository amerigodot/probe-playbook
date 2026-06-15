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

/**
 * Audit RBAC: Verifies that granular role claims are enforced by the backend.
 * This tool expects environment variables for tokens with different roles.
 */
async function auditEnterpriseRBAC() {
    console.log("🚀 Starting Enterprise RBAC & Security Audit...");

    const testCases = [
        {
            role: 'SRE',
            token: process.env.TEST_TOKEN_SRE,
            action: 'POST',
            entity: 'policies',
            expectedStatus: 200 // SRE can create policies
        },
        {
            role: 'Observer',
            token: process.env.TEST_TOKEN_OBSERVER,
            action: 'POST',
            entity: 'policies',
            expectedStatus: 403 // Observer should be forbidden
        }
    ];

    for (const test of testCases) {
        if (!test.token) {
            console.log(`⚠️ Skipping ${test.role} test: No token provided.`);
            continue;
        }

        console.log(`🔍 Testing ${test.action} as ${test.role} on ${test.entity}...`);
        try {
            const response = await axios({
                method: test.action,
                url: `${API_ENDPOINT}/data-service`,
                params: { entity: test.entity },
                headers: { 'Authorization': `Bearer ${test.token}` },
                data: test.action === 'POST' ? { name: "Audit Policy" } : undefined
            });

            if (response.status === test.expectedStatus) {
                console.log(`✅ ${test.role} test PASSED (Status ${response.status})`);
            } else {
                console.error(`❌ ${test.role} test FAILED: Expected ${test.expectedStatus}, got ${response.status}`);
            }
        } catch (error: any) {
            const status = error.response?.status;
            if (status === test.expectedStatus) {
                console.log(`✅ ${test.role} test PASSED (Expected Forbidden Status ${status})`);
            } else {
                console.error(`❌ ${test.role} test FAILED: Expected ${test.expectedStatus}, got ${status || error.message}`);
            }
        }
    }

    console.log("✨ RBAC Audit Complete.");
}

auditEnterpriseRBAC();
