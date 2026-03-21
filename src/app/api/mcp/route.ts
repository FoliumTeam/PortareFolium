import { NextRequest, NextResponse } from "next/server";
import { validateAgentToken } from "@/lib/agent-token";
import { MCP_TOOLS, dispatchTool } from "@/lib/mcp-tools";

// Bearer 토큰 추출
function extractBearer(req: NextRequest): string | null {
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return null;
    return auth.slice(7).trim() || null;
}

// 인증 미들웨어
async function authenticate(req: NextRequest) {
    const raw = extractBearer(req);
    if (!raw) return null;
    return validateAgentToken(raw);
}

// MCP tools/list 응답
function toolsListResponse(id: unknown) {
    return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: MCP_TOOLS },
    });
}

// MCP tools/call 응답
async function toolsCallResponse(
    id: unknown,
    toolName: string,
    args: Record<string, unknown>
) {
    try {
        const result = await dispatchTool(toolName, args);
        return NextResponse.json({
            jsonrpc: "2.0",
            id,
            result: {
                content: [
                    { type: "text", text: JSON.stringify(result, null, 2) },
                ],
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
            {
                jsonrpc: "2.0",
                id,
                error: { code: -32000, message },
            },
            { status: 200 }
        );
    }
}

// POST /api/mcp — JSON-RPC 2.0 over HTTP (MCP Streamable HTTP Transport)
export async function POST(req: NextRequest) {
    const agent = await authenticate(req);
    if (!agent) {
        return NextResponse.json(
            {
                jsonrpc: "2.0",
                id: null,
                error: { code: -32001, message: "Unauthorized" },
            },
            { status: 401 }
        );
    }

    let body: {
        jsonrpc?: string;
        id?: unknown;
        method?: string;
        params?: unknown;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            {
                jsonrpc: "2.0",
                id: null,
                error: { code: -32700, message: "Parse error" },
            },
            { status: 400 }
        );
    }

    const { id = null, method, params } = body;

    // initialize — MCP 핸드셰이크
    if (method === "initialize") {
        return NextResponse.json({
            jsonrpc: "2.0",
            id,
            result: {
                protocolVersion: "2024-11-05",
                capabilities: { tools: {} },
                serverInfo: { name: "portare-folium-mcp", version: "1.0.0" },
            },
        });
    }

    // tools/list
    if (method === "tools/list") {
        return toolsListResponse(id);
    }

    // tools/call
    if (method === "tools/call") {
        const p = (params ?? {}) as {
            name?: string;
            arguments?: Record<string, unknown>;
        };
        const toolName = p.name ?? "";
        const args = p.arguments ?? {};

        if (!toolName) {
            return NextResponse.json(
                {
                    jsonrpc: "2.0",
                    id,
                    error: { code: -32602, message: "tool name required" },
                },
                { status: 400 }
            );
        }

        return toolsCallResponse(id, toolName, args);
    }

    return NextResponse.json(
        {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: "Method not found" },
        },
        { status: 404 }
    );
}

// GET /api/mcp — 서버 정보 (선택적)
export async function GET() {
    return NextResponse.json({
        name: "portare-folium-mcp",
        version: "1.0.0",
        protocol: "MCP 2024-11-05",
        tools: MCP_TOOLS.map((t) => t.name),
    });
}
