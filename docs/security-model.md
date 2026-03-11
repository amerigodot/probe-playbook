# AgentOps Security & Data Sovereignty Model

This document outlines the enterprise-grade security architecture of AgentOps, focusing on identity management, multi-tenant isolation, and auditable governance.

## 1. Identity & Access Management (IAM)

### Microsoft Entra ID (Formerly Azure AD)
AgentOps uses **Microsoft Entra ID** as its primary identity provider. This ensures:
- **Single Sign-On (SSO):** Users can authenticate using their existing corporate credentials.
- **Conditional Access:** Integration with enterprise-wide security policies (e.g., MFA, device compliance).
- **Entra RBAC:** Application roles (e.g., Compliance Officer, SRE, Agent Owner) are managed within Entra ID and mapped to application-level permissions.

### RBAC Mapping
| Entra Role | Application Role | Permissions |
| :--- | :--- | :--- |
| `AgentOps.ComplianceOfficer` | Observer | Read-only access to all telemetry and audit logs. |
| `AgentOps.SRE` | Admin | Can manage policies and incidents. |
| `AgentOps.Owner` | Owner | Full workspace management and member control. |

## 2. Multi-Tenant Isolation (Row-Level Security)

To provide "Best Enterprise Solution" security, AgentOps implements **Row-Level Security (RLS)** within **Azure SQL Database**. This ensures that even in a multi-tenant environment, data is strictly isolated at the database engine level.

### Technical Implementation
1.  **Workspace Context:** Upon authentication, the backend (Azure Functions) extracts the `workspace_id` from the Entra ID token claims.
2.  **Session Context:** Every database query is preceded by setting the `SESSION_CONTEXT(N'workspace_id', @wsid)`.
3.  **Predicate Enforcement:** The Azure SQL security policy (`WorkspaceFilter`) uses a predicate function (`Security.fn_securitypredicate`) to filter rows automatically based on the session's `workspace_id`.

### Security Predicate (T-SQL)
```sql
CREATE FUNCTION Security.fn_securitypredicate(@workspace_id UNIQUEIDENTIFIER)
    RETURNS TABLE WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS fn_securitypredicate_result
    WHERE @workspace_id = CAST(SESSION_CONTEXT(N'workspace_id') AS UNIQUEIDENTIFIER)
       OR IS_MEMBER('db_owner') = 1;
```

## 3. Data Sovereignty & Encryption

- **Data at Rest:** All data in Azure SQL and Azure Storage is encrypted using **Azure Storage Service Encryption (SSE)** and **Transparent Data Encryption (TDE)** with Microsoft-managed or Customer-managed keys (CMK).
- **Data in Transit:** All communication between agents, the backend, and the console is forced over **TLS 1.2+**.
- **Regional Isolation:** Resources can be deployed in specific Azure regions (e.g., North Europe, East US) to comply with local data residency regulations (GDPR, CCPA).

## 4. Auditability & Compliance

Every action within AgentOps—whether by a human operator or an autonomous agent (like OpsSentinel)—is recorded in the `audit_logs` table.

- **Immutability:** Audit logs are insert-only for application users.
- **Traceability:** Integration with **Azure Monitor** and **Application Insights** provides a distributed trace of every policy violation from ingestion to remediation.
- **Retention:** Log retention policies are configured in the **Log Analytics Workspace** to meet compliance requirements.
