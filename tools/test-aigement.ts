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
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// We run against the local Vite dev server endpoint
const API_ENDPOINT = 'http://localhost:8080/api';

async function testStatefulSteering() {
  console.log("🚀 Starting Standalone Aigement Stateful Steering Test...");

  try {
    // 1. Provision a test agent and API key in Supabase
    // Get first workspace
    const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('id').limit(1);
    if (wsErr || !workspaces || workspaces.length === 0) {
      console.error("❌ No workspaces found in database. Make sure Supabase is set up.");
      return;
    }
    const workspaceId = workspaces[0].id;

    // Fetch or create an active API key
    let rawApiKey = '';
    const { data: existingKeys } = await supabase
      .from('api_keys')
      .select('key_hash')
      .filter('revoked_at', 'is', null)
      .limit(1);

    if (existingKeys && existingKeys.length > 0) {
      // Look for a raw key saved in localStorage by the UI, or generate a test one
      rawApiKey = 'test_key_' + Math.random().toString(36).substring(2, 10);
      const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
      
      // Insert this new test key
      await supabase.from('api_keys').insert({
        workspace_id: workspaceId,
        key_hash: keyHash,
        label: 'Aigement Automated Test Key'
      });
      console.log(`🔑 Provisioned new test key: ${rawApiKey}`);
    } else {
      rawApiKey = 'test_key_new_' + Math.random().toString(36).substring(2, 10);
      const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
      await supabase.from('api_keys').insert({
        workspace_id: workspaceId,
        key_hash: keyHash,
        label: 'Aigement Automated Test Key'
      });
      console.log(`🔑 Created fresh workspace key: ${rawApiKey}`);
    }

    // Fetch or create test agent
    let agentId = '';
    const { data: agents } = await supabase.from('agents').select('id').eq('workspace_id', workspaceId).limit(1);
    if (agents && agents.length > 0) {
      agentId = agents[0].id;
      console.log(`🤖 Using existing agent: ${agentId}`);
    } else {
      const { data: newAgent } = await supabase.from('agents').insert({
        workspace_id: workspaceId,
        name: 'Aigement Test Bot',
        environment: 'dev'
      }).select('id').single();
      
      agentId = newAgent.id;
      console.log(`🤖 Created new test agent: ${agentId}`);
    }

    // Ensure a policy is linked to this agent
    const { data: policyList } = await supabase.from('policies').select('id').eq('workspace_id', workspaceId).limit(1);
    let policyId = '';
    if (policyList && policyList.length > 0) {
      policyId = policyList[0].id;
    } else {
      // Create a test policy for PII and blocked topics
      const { data: newPolicy } = await supabase.from('policies').insert({
        workspace_id: workspaceId,
        name: 'Test Steering Policy',
        rule_config: {
          rules: [
            { type: 'pii_detection', params: { categories: ['ssn', 'email'] } },
            { type: 'blocked_topics', params: { topics: ['competitor', 'pricing'] } }
          ]
        }
      }).select('id').single();
      policyId = newPolicy.id;
    }

    // Link policy if not already linked
    await supabase.from('agent_policies').insert({
      agent_id: agentId,
      policy_id: policyId
    }).catch(() => {}); // ignore duplicates

    const sessionId = `test_session_${Date.now()}`;

    // --- STEP 1: Send a prompt that triggers a post-inference warning ---
    console.log("\n💬 Prompt 1: Requesting query with potential PII output...");
    const res1 = await axios.post(`${API_ENDPOINT}/inference`, {
      agent_id: agentId,
      session_id: sessionId,
      prompt: "Show me customer SSN records please.",
      parameters: { temperature: 0.8 }
    }, {
      headers: { 'x-api-key': rawApiKey }
    });

    console.log("📥 Response 1:", res1.data.response);
    console.log("🛡️ Decision:", res1.data.decision);
    console.log("🔍 Steering Applied:", res1.data.audit_trail.steering_applied);
    console.log("🛡️ Output Verification:", res1.data.audit_trail.output_check);

    // --- STEP 2: Send a subsequent prompt in the same session ---
    console.log("\n💬 Prompt 2: Sending normal prompt in the same session...");
    const res2 = await axios.post(`${API_ENDPOINT}/inference`, {
      agent_id: agentId,
      session_id: sessionId,
      prompt: "Hello, how are you?",
      parameters: { temperature: 0.8 }
    }, {
      headers: { 'x-api-key': rawApiKey }
    });

    console.log("📥 Response 2:", res2.data.response);
    console.log("🛡️ Decision:", res2.data.decision);
    console.log("🔍 Steering Applied:", res2.data.audit_trail.steering_applied);
    console.log("📜 Steering Reason:", res2.data.audit_trail.steering_reason);

    // Verify steering was applied on prompt 2
    if (res2.data.audit_trail.steering_applied) {
      console.log("\n✨ SUCCESS: Stateful Aigement steering was verified successfully! QMS intervened on the second prompt based on the first prompt's violation history.");
    } else {
      console.log("\n❌ FAILURE: Steering was not applied to the second prompt.");
    }

  } catch (error: any) {
    console.error("\n❌ Error during execution:", error.response?.data || error.message);
    console.error("Please ensure your Vite local dev server is running on port 8080 (npm run dev).");
  }
}

testStatefulSteering();
