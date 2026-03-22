import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { parse } from "node:url";
import { timingSafeEqual } from "node:crypto";
import type { RemoteMessage, ReplyPayload } from "./handlers.js";

/**
 * Constant-time token comparison to prevent timing attacks.
 */
function safeTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export interface HttpServerOptions {
  port: number;
  host: string;
  path: string;
  token: string;
  onMessage: (msg: RemoteMessage) => Promise<ReplyPayload>;
  onError: (err: Error) => void;
}

export function createHttpServer(opts: HttpServerOptions) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS 头
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }
    
    const parsedUrl = parse(req.url || "", true);
    if (parsedUrl.pathname !== opts.path) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }
    
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    
    // 验证 Token
    const auth = req.headers.authorization || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!safeTokenCompare(token, opts.token)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }
    
    try {
      const msg = JSON.parse(body) as RemoteMessage;
      const reply = await opts.onMessage(msg);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, reply }));
    } catch (err) {
      opts.onError(err as Error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal error" }));
    }
  });
  
  server.listen(opts.port, opts.host, () => {
    console.log(`HTTP server listening on ${opts.host}:${opts.port}`);
  });
  
  return server;
}
