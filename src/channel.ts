/**
 * Channel Plugin 主定义
 */

import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk";
import { normalizeAccountId } from "openclaw/plugin-sdk";

import { logger } from "./util/logger.js";
import { sendRemoteOutbound } from "./messaging/outbound.js";
import { createHttpServer } from "./server/http-server.js";
import { createWsServer } from "./server/ws-server.js";
import { createMessageHandler } from "./server/handlers.js";
import { resolveRemoteChannelRuntime } from "./runtime.js";

export interface ResolvedRemoteAccount {
  accountId: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  config: RemoteConfig;
}

interface RemoteConfig {
  port: number;
  token: string;
  path: string;
  host: string;
}

export const remotePlugin: ChannelPlugin<ResolvedRemoteAccount> = {
  id: "opencode-remote",
  meta: {
    id: "opencode-remote",
    label: "opencode-remote",
    selectionLabel: "opencode-remote (HTTP)",
    docsPath: "/channels/opencode-remote",
    docsLabel: "opencode-remote",
    blurb: "Remote channel via HTTP/WebSocket",
    order: 80,
  },
  configSchema: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  capabilities: {
    chatTypes: ["direct"],
    media: false,
  },
  messaging: {
    targetResolver: {
      looksLikeId: (raw) => raw.includes("@remote"),
    },
  },
  agentPrompt: {
    messageToolHints: () => [
      "This is a remote control channel. Messages are received via HTTP API.",
    ],
  },
  reload: { configPrefixes: ["channels.opencode-remote"] },
  config: {
    listAccountIds: (cfg) => ["default"],
    resolveAccount: (cfg, accountId) => resolveRemoteAccount(cfg, accountId),
    isConfigured: (account) => account.configured,
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.configured,
    }),
  },
  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 4000,
    sendText: async (ctx) => {
      const result = await sendRemoteOutbound({
        cfg: ctx.cfg,
        to: ctx.to,
        text: ctx.text,
        accountId: ctx.accountId,
      });
      return result;
    },
  },
  status: {
    defaultRuntime: {
      accountId: "",
      lastError: null,
      lastInboundAt: null,
      lastOutboundAt: null,
    },
    collectStatusIssues: () => [],
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      lastError: snapshot.lastError ?? null,
      lastInboundAt: snapshot.lastInboundAt ?? null,
      lastOutboundAt: snapshot.lastOutboundAt ?? null,
    }),
    buildAccountSnapshot: ({ account, runtime }) => ({
      ...runtime,
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.configured,
    }),
  },
  auth: {
    login: async ({ runtime }) => {
      logger.info("Remote channel does not require login");
    },
  },
  gateway: {
    startAccount: async (ctx) => {
      if (!ctx) {
        logger.warn(`gateway.startAccount: called with undefined ctx`);
        return;
      }
      const account = ctx.account;
      const aLog = logger.withAccount(account.accountId);
      const { port, token, host, path } = account.config;

      aLog.info(`starting remote channel on ${host}:${port}${path}`);

      // 获取运行时
      const channelRuntime = ctx.channelRuntime
        || (await resolveRemoteChannelRuntime({ waitTimeoutMs: 5000 }));

      // 创建消息处理器
      const rawHandler = createMessageHandler({
        channelRuntime,
        config: ctx.cfg,
        accountId: account.accountId,
      });

      const httpHandler = async (msg: import("./server/handlers.js").RemoteMessage) => {
        let result: import("./server/handlers.js").ReplyPayload = { text: "" };
        await rawHandler(msg, (reply) => { result = reply; });
        return result;
      };

      const wsHandler = async (msg: import("./server/handlers.js").RemoteMessage, send: (reply: import("./server/handlers.js").ReplyPayload) => void) => {
        await rawHandler(msg, send);
      };

      // 启动 HTTP 服务器
      try {
        createHttpServer({
          port,
          host,
          path,
          token,
          onMessage: httpHandler,
          onError: (err) => aLog.error(`HTTP server error: ${err.message}`),
        });
      } catch (err) {
        aLog.error(`Failed to start HTTP server: ${(err as Error).message}`);
      }

      // 启动 WebSocket 服务器
      try {
        createWsServer({
          port: port + 1,
          host,
          token,
          onMessage: wsHandler,
          onError: (err) => aLog.error(`WebSocket server error: ${err.message}`),
        });
      } catch (err) {
        aLog.warn(`WebSocket server optional, failed to start: ${(err as Error).message}`);
      }

      ctx.setStatus?.({
        accountId: account.accountId,
        running: true,
        lastStartAt: Date.now(),
        lastEventAt: Date.now(),
      });
    },
    loginWithQrStart: async () => {
      return { qrDataUrl: undefined, message: "Not implemented" };
    },
    loginWithQrWait: async () => {
      return { connected: false, message: "Not implemented" };
    },
  },
};

function resolveRemoteAccount(
  cfg: OpenClawConfig,
  accountId?: string | null,
): ResolvedRemoteAccount {
  const id = accountId ?? "default";

  // Read config from OpenClaw channels config
  const channelConfig = (
    cfg.channels as Record<string, unknown> | undefined
  )?.["opencode-remote"] as Record<string, unknown> | undefined;

  const resolvedConfig: RemoteConfig = {
    port: (channelConfig?.port as number) ?? 18888,
    token: (channelConfig?.token as string) ?? "change-me",
    path: (channelConfig?.path as string) ?? "/api/chat",
    host: (channelConfig?.host as string) ?? "0.0.0.0",
  };

  const configured = Boolean(channelConfig && channelConfig.enabled !== false);

  return {
    accountId: id,
    name: `Remote Channel`,
    enabled: true,
    configured,
    config: resolvedConfig,
  };
}
