import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as sql from "mssql";
import { validateToken, getWorkspaceIdFromToken } from "../shared/auth";

const sqlConfig = process.env.SQL_CONNECTION_STRING || "";

const dataService: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        context.res = { status: 401, body: { error: "Missing or invalid authorization header" } };
        return;
    }

    const token = authHeader.split(" ")[1];
    let workspaceId: string;

    try {
        const decoded = await validateToken(token);
        workspaceId = getWorkspaceIdFromToken(decoded);
    } catch (err) {
        context.res = { status: 401, body: { error: "Invalid token" } };
        return;
    }

    try {
        const pool = await sql.connect(sqlConfig);
        // Set RLS Session Context
        await pool.request().query(`EXEC sp_set_session_context 'workspace_id', '${workspaceId}'`);

        const entity = req.query.entity || "agents"; // agents, policies, incidents, audit_logs
        const id = req.query.id;

        if (req.method === "GET") {
            if (id) {
                const result = await pool.request()
                    .input("id", sql.UniqueIdentifier, id)
                    .query(`SELECT * FROM ${entity} WHERE id = @id`);
                context.res = { body: result.recordset[0] || { error: "Not found" } };
            } else {
                const result = await pool.request().query(`SELECT * FROM ${entity} ORDER BY created_at DESC`);
                context.res = { body: result.recordset };
            }
        } else if (req.method === "POST") {
            // Implement generic POST logic or specific per entity
            context.res = { status: 501, body: { error: "POST not yet implemented in data-service" } };
        } else {
            context.res = { status: 405, body: { error: "Method not allowed" } };
        }

    } catch (err: any) {
        context.log.error("Data Service Error:", err);
        context.res = { status: 500, body: { error: "Internal server error", detail: err.message } };
    }
};

export default dataService;
