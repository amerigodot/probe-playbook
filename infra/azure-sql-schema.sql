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

-- 6. Create Audit Logs Table
CREATE TABLE audit_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL REFERENCES workspaces(id),
    user_id NVARCHAR(255), -- Entra ID Object ID
    action NVARCHAR(255) NOT NULL,
    resource_type NVARCHAR(255) NOT NULL,
    resource_id UNIQUEIDENTIFIER,
    details NVARCHAR(MAX), -- JSON string
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
