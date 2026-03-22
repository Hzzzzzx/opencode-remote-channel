import { WebSocketServer, WebSocket } from "ws";
import { parse } from "node:url";
import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { RemoteMessage, ReplyPayload } from "./handlers.js";

function safeTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export interface WsServerOptions {
  port: number;
  host: string;
  token: string;
  onMessage: (msg: RemoteMessage, send: (reply: ReplyPayload) => void) => Promise<void>;
  onError: (err: Error) => void;
}

export function createWsServer(opts: WsServerOptions) {
  const wss = new WebSocketServer({ port: opts.port, host: opts.host });
  
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const parsedUrl = parse(req.url || "", true);
    // 支持 query token 和 Authorization header (Bearer token)
    const queryToken = parsedUrl.query.token as string || "";
    const authHeader = req.headers.authorization || "";
    const headerToken = authHeader.replace(/^Bearer\s+/i, "");
    const token = queryToken || headerToken;
    
    if (!safeTokenCompare(token, opts.token)) {
      ws.close(4001, "Unauthorized");
      return;
    }
    
    const send = (reply: ReplyPayload) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(reply));
      }
    };
    
    ws.on("message", async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as RemoteMessage;
        await opts.onMessage(msg, send);
      } catch (err) {
        opts.onError(err as Error);
      }
    });
    
    ws.on("error", (err) => {
      opts.onError(err);
    });
  });
  
  wss.on("listening", () => {
    console.log(`WebSocket server listening on ${opts.host}:${opts.port}`);
  });
  
  return wss;
}
