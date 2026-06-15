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

/*
  AgentOps — Azure SQL Schema with Row-Level Security (RLS)
  
  This script creates the core tables and sets up multi-tenant isolation 
  using a 'workspace_id' column and RLS functions.
*/

-- 1. Create Workspaces Table
CREATE TABLE workspaces (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);

-- 2. Create Agents Table
CREATE TABLE agents (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL REFERENCES workspaces(id),
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    environment NVARCHAR(50) CHECK (environment IN ('dev', 'stage', 'prod')),
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);

-- 3. Create Policies Table
CREATE TABLE policies (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL REFERENCES workspaces(id),
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    rule_config NVARCHAR(MAX), -- JSON string
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);

-- 4. Create Events Table
CREATE TABLE events (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL REFERENCES workspaces(id),
    agent_id UNIQUEIDENTIFIER NOT NULL REFERENCES agents(id),
    event_type NVARCHAR(255) NOT NULL,
    severity NVARCHAR(50) CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    session_id NVARCHAR(255),
    payload_summary NVARCHAR(MAX),
    raw_details NVARCHAR(MAX), -- JSON string
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);

-- 5. Create Policy Violations Table
CREATE TABLE policy_violations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL REFERENCES workspaces(id),
    policy_id UNIQUEIDENTIFIER NOT NULL REFERENCES policies(id),
    agent_id UNIQUEIDENTIFIER NOT NULL REFERENCES agents(id),
    event_id UNIQUEIDENTIFIER NOT NULL REFERENCES events(id),
    violation_details NVARCHAR(MAX), -- JSON string
    severity NVARCHAR(50) NOT NULL,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);

-- 6. Create Governance Audit Trail Table
-- This schema ensures every action has a tenant, an actor, a policy context, and a clear decision.
CREATE TABLE audit_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL REFERENCES workspaces(id),
    
    -- Actor Details
    actor_id NVARCHAR(255) NOT NULL, -- Entra ID OID or 'system.ops-sentinel'
    actor_type NVARCHAR(50) NOT NULL CHECK (actor_type IN ('user', 'system', 'agent')),
    
    -- Governance Context
    policy_id UNIQUEIDENTIFIER NULL REFERENCES policies(id),
    action NVARCHAR(255) NOT NULL, -- e.g., 'ingest', 'policy_update', 'remediation'
    decision NVARCHAR(50) NOT NULL CHECK (decision IN ('allow', 'flag', 'block', 'quarantine', 'update', 'none')),
    
    -- Evidence & Metadata
    resource_type NVARCHAR(255) NOT NULL,
    resource_id UNIQUEIDENTIFIER NULL,
    evidence NVARCHAR(MAX), -- JSON blob containing CoVe results, safety scores, etc.
    
    ip_address NVARCHAR(50),
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);

-- 7. RLS Implementation
-- Create a schema for security objects
CREATE SCHEMA Security;
GO

-- Create the function that identifies the current workspace
-- In a production Azure SQL setup, the application sets 'SESSION_CONTEXT'
-- with the active workspace_id after authenticating the Entra ID user.
CREATE FUNCTION Security.fn_securitypredicate(@workspace_id UNIQUEIDENTIFIER)
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS fn_securitypredicate_result
    WHERE @workspace_id = CAST(SESSION_CONTEXT(N'workspace_id') AS UNIQUEIDENTIFIER)
       OR IS_MEMBER('db_owner') = 1; -- Admins can bypass
GO

-- 8. Apply RLS Policies to all multi-tenant tables
CREATE SECURITY POLICY WorkspaceFilter
ADD FILTER PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.agents,
ADD BLOCK PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.agents,
ADD FILTER PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.policies,
ADD BLOCK PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.policies,
ADD FILTER PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.events,
ADD BLOCK PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.events,
ADD FILTER PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.policy_violations,
ADD BLOCK PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.policy_violations,
ADD FILTER PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.audit_logs,
ADD BLOCK PREDICATE Security.fn_securitypredicate(workspace_id) ON dbo.audit_logs
WITH (STATE = ON);
GO
