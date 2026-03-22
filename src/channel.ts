import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk";
import { normalizeAccountId } from "openclaw/plugin-sdk";

import { logger } from "./util/logger.js";
import { resolveRemoteChannelRuntime } from "./runtime.js";
import { createMessageHandler } from "./server/handlers.js";
import { startPolling, sendReply } from "./ilink/polling.js";
import { loadCredentials, doQRLogin } from "./ilink/login.js";
import type { AccountData, ParsedMessage } from "./types/ilink-types.js";

export interface ResolvedWechatAccount {
  accountId: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  config: WechatConfig;
}

interface WechatConfig {
  baseUrl: string;
}

export const wechatPlugin: ChannelPlugin<ResolvedWechatAccount> = {
  id: "opencode-wechat",
  meta: {
    id: "opencode-wechat",
    label: "opencode-wechat",
    selectionLabel: "opencode-wechat (ilink)",
    docsPath: "/channels/opencode-wechat",
    docsLabel: "opencode-wechat",
    blurb: "WeChat channel via ilink API",
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
      looksLikeId: (raw) => raw.includes("@wechat"),
    },
  },
  agentPrompt: {
    messageToolHints: () => [
      "This is a WeChat channel. Messages are received via ilink API.",
    ],
  },
  reload: { configPrefixes: ["channels.opencode-wechat"] },
  config: {
    listAccountIds: (cfg) => ["default"],
    resolveAccount: (cfg, accountId) => resolveWechatAccount(cfg, accountId),
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
      logger.info(`[outbound] to=${ctx.to} text=${ctx.text.slice(0, 50)}...`);
      return {
        channel: "opencode-wechat",
        messageId: `wechat-${Date.now()}`,
        chatId: ctx.to,
      };
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
      logger.info("Wechat channel login via ilink QR code");
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
      aLog.info("starting wechat channel via ilink");

      let creds = loadCredentials();
      if (!creds) {
        aLog.info("未找到已保存的凭据，启动微信扫码登录...");
        creds = await doQRLogin(account.config.baseUrl);
        if (!creds) {
          aLog.error("登录失败");
          return;
        }
      } else {
        aLog.info(`使用已保存账号: ${creds.accountId}`);
      }

      const channelRuntime = ctx.channelRuntime
        || (await resolveRemoteChannelRuntime({ waitTimeoutMs: 5000 }));

      const rawHandler = createMessageHandler({
        channelRuntime,
        config: ctx.cfg,
        accountId: account.accountId,
      });

      await startPolling({
        account: creds,
        onMessage: async (parsed: ParsedMessage) => {
          const httpHandler = async (msg: import("./server/handlers.js").RemoteMessage) => {
            let result: import("./server/handlers.js").ReplyPayload = { text: "" };
            await rawHandler(msg, (reply) => { result = reply; });
            return result;
          };

          const fakeMsg = {
            message: parsed.text,
            peerId: parsed.senderId,
            sessionId: `wechat:${account.accountId}:${parsed.senderId}`,
          };

          const response = await httpHandler(fakeMsg);
          if (response.text) {
            await sendReply(creds, parsed, response.text);
          }
        },
        onError: (err) => {
          aLog.error(`处理消息失败: ${String(err)}`);
        },
      });

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

function resolveWechatAccount(
  cfg: OpenClawConfig,
  accountId?: string | null,
): ResolvedWechatAccount {
  const id = accountId ?? "default";

  const channelConfig = (
    cfg.channels as Record<string, unknown> | undefined
  )?.["opencode-wechat"] as Record<string, unknown> | undefined;

  const resolvedConfig: WechatConfig = {
    baseUrl: (channelConfig?.baseUrl as string) ?? "https://ilinkai.weixin.qq.com",
  };

  const configured = Boolean(channelConfig && channelConfig.enabled !== false);

  return {
    accountId: id,
    name: `WeChat Channel`,
    enabled: true,
    configured,
    config: resolvedConfig,
  };
}