/**
 * Channel Plugin 主定义
 */

import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk";
import { normalizeAccountId } from "openclaw/plugin-sdk";

import { logger } from "./util/logger.js";
import { sendRemoteOutbound } from "./messaging/outbound.js";

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
      logger.debug(`startAccount entry`);
      if (!ctx) {
        logger.warn(`gateway.startAccount: called with undefined ctx`);
        return;
      }
      const account = ctx.account;
      const aLog = logger.withAccount(account.accountId);
      aLog.info(`starting remote channel`);

      ctx.setStatus?.({
        accountId: account.accountId,
        running: true,
        lastStartAt: Date.now(),
        lastEventAt: Date.now(),
      });

      // TODO: Start HTTP/WebSocket server
      logger.info(`Remote channel would start server on port ${account.config.port}`);
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
  return {
    accountId: id,
    name: `Remote Channel`,
    enabled: true,
    configured: true, // TODO: check config
    config: {
      port: 18888,
      token: "change-me",
      path: "/api/chat",
      host: "0.0.0.0",
    },
  };
}
