import * as sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

const sqlConfig = process.env.SQL_CONNECTION_STRING || "";

async function triggerOpsSentinelAudit() {
    console.log("🚀 Triggering OpsSentinel Autonomous Remediation Audit...");

    try {
        const pool = await sql.connect(sqlConfig);
        
        // 1. Create a dummy workspace and agent if they don't exist, or use existing IDs
        const wsId = '00000000-0000-0000-0000-000000000000'; // Replace with a valid ID for testing
        
        // 2. Insert a High Severity Incident
        console.log("📝 Inserting High Severity Incident...");
        const result = await pool.request()
            .input('wsId', sql.UniqueIdentifier, wsId)
            .query(`
                INSERT INTO incidents (workspace_id, title, severity, status, created_at)
                OUTPUT INSERTED.id
                VALUES (@wsId, 'CRITICAL: Data Leak Simulation', 'critical', 'open', SYSDATETIMEOFFSET())
            `);
        
        const incidentId = result.recordset[0].id;
        console.log(`✅ Incident Created: ${incidentId}`);

        // 3. Log a violation to provide context for OpsSentinel
        console.log("📝 Adding Violation Context...");
        await pool.request()
            .input('wsId', sql.UniqueIdentifier, wsId)
            .input('incId', sql.UniqueIdentifier, incidentId)
            .query(`
                INSERT INTO policy_violations (workspace_id, agent_id, event_id, violation_details, severity)
                VALUES (@wsId, @wsId, @wsId, '{"rule_type":"pii_leak", "message":"SSN Leak detected in response"}', 'critical')
            `);

        console.log("✨ SUCCESS: Incident and Violation context seeded.");
        console.log("👉 Next: Run the OpsSentinel Azure Function locally or wait for timer to trigger.");
        console.log("🔍 Audit Goal: Check if a GitHub PR is opened and a comment is added to incident " + incidentId);

    } catch (err) {
        console.error("❌ SQL Error:", err);
    }
}

triggerOpsSentinelAudit();
