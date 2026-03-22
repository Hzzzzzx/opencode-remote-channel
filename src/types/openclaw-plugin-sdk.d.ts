// Type declarations for openclaw/plugin-sdk
// These types are provided by the OpenCode host application at runtime

declare module "openclaw/plugin-sdk" {
  export interface OpenClawPluginApi {
    runtime?: PluginRuntime;
    registerChannel(options: { plugin: any }): void;
    registerCli(options: any): void;
  }

  export interface PluginRuntime {
    channel: ChannelRuntime;
    commands: any;
  }

  export interface ChannelRuntime {
    reply: ReplyRuntime;
    routing: RoutingRuntime;
    session: SessionRuntime;
    media: MediaRuntime;
  }

  export interface ReplyRuntime {
    finalizeInboundContext(ctx: any): any;
    dispatchReplyFromConfig(options: any): Promise<void>;
    createReplyDispatcherWithTyping(options: any): any;
    withReplyDispatcher(options: any): Promise<void>;
    resolveHumanDelayConfig(cfg: any, agentId?: string): number;
  }

  export interface RoutingRuntime {
    resolveAgentRoute(options: any): { agentId?: string; sessionKey?: string; mainSessionKey?: string };
  }

  export interface SessionRuntime {
    recordInboundSession(options: any): Promise<void>;
    resolveStorePath(store: any, options: any): string;
  }

  export interface MediaRuntime {
    saveMediaBuffer(options: any): Promise<string>;
  }

  export function buildChannelConfigSchema(schema: any): any;
  export function normalizeAccountId(id: string): string;

  export { OpenClawConfig } from "openclaw/plugin-sdk/core";

  export interface ChannelPluginAccount {
    accountId: string;
    name: string;
    enabled: boolean;
    configured: boolean;
    [key: string]: any;
  }

  export interface ChannelPluginRuntime {
    setStatus?(status: any): void;
    channelRuntime?: ChannelRuntime;
    [key: string]: any;
  }

  export interface ChannelPlugin<Account extends ChannelPluginAccount = ChannelPluginAccount> {
    id: string;
    meta: {
      id: string;
      label: string;
      selectionLabel: string;
      docsPath?: string;
      docsLabel?: string;
      blurb?: string;
      order?: number;
    };
    configSchema?: any;
    capabilities?: {
      chatTypes?: string[];
      media?: boolean;
    };
    messaging?: {
      targetResolver?: {
        looksLikeId?: (raw: string) => boolean;
      };
    };
    agentPrompt?: {
      messageToolHints?: () => string[];
    };
    reload?: {
      configPrefixes?: string[];
    };
    config?: {
      listAccountIds?: (cfg: OpenClawConfig) => string[];
      resolveAccount?: (cfg: OpenClawConfig, accountId: string | null) => Account;
      isConfigured?: (account: Account) => boolean;
      describeAccount?: (account: Account) => any;
    };
    outbound?: {
      deliveryMode?: string;
      textChunkLimit?: number;
      sendText?: (ctx: any) => Promise<any>;
    };
    status?: {
      defaultRuntime?: any;
      collectStatusIssues?: () => any[];
      buildChannelSummary?: (options: any) => any;
      buildAccountSnapshot?: (options: any) => any;
    };
    auth?: {
      login?: (options: any) => Promise<void>;
    };
    gateway?: {
      startAccount?: (ctx: ChannelPluginRuntime) => Promise<void>;
      loginWithQrStart?: () => Promise<any>;
      loginWithQrWait?: () => Promise<any>;
    };
  }
}

declare module "openclaw/plugin-sdk/core" {
  export interface OpenClawConfig {
    channels?: Record<string, any>;
    session?: any;
    [key: string]: any;
  }
}
