import type { PluginRuntime } from "openclaw/plugin-sdk";
import { createInboundMessage, type RemoteMsgContext, type RemoteMessage } from "../messaging/inbound.js";
import { splitTextIntoChunks } from "../messaging/chunks.js";
import { resolveRemoteChannelRuntime } from "../runtime.js";

export { type RemoteMessage };

export interface ReplyPayload {
  text: string;
}

export interface MessageHandlerDeps {
  channelRuntime?: PluginRuntime["channel"];
  config: any;
  accountId: string;
}

export function createMessageHandler(deps: MessageHandlerDeps) {
  return async function handleMessage(
    msg: RemoteMessage,
    sendReply: (reply: ReplyPayload) => void
  ) {
    const runtime = await resolveRemoteChannelRuntime({
      channelRuntime: deps.channelRuntime,
    });
    
    const ctx = createInboundMessage(msg, deps.accountId);
    
    const route = runtime.routing.resolveAgentRoute({
      cfg: deps.config,
      channel: "opencode-remote",
      accountId: deps.accountId,
      peer: { kind: "direct", id: ctx.From },
    });
    
    ctx.SessionKey = route.sessionKey;
    
    const storePath = runtime.session.resolveStorePath(
      deps.config.session?.store,
      { agentId: route.agentId }
    );
    
    const finalized = runtime.reply.finalizeInboundContext(ctx);
    
    await runtime.session.recordInboundSession({
      storePath,
      sessionKey: route.sessionKey,
      ctx: finalized,
      updateLastRoute: {
        sessionKey: route.mainSessionKey,
        channel: "opencode-remote",
        to: ctx.To,
        accountId: deps.accountId,
      },
      onRecordError: (err: unknown) => console.error("recordInboundSession error:", err),
    });
    
    const { dispatcher, replyOptions, markDispatchIdle } =
      runtime.reply.createReplyDispatcherWithTyping({
        humanDelay: runtime.reply.resolveHumanDelayConfig(deps.config, route.agentId),
        typingCallbacks: { start: async () => {}, stop: async () => {} },
        deliver: async (payload: { text?: string }) => {
          const text = payload.text ?? "";
          const chunks = splitTextIntoChunks(text, 4000);
          for (const chunk of chunks) {
            sendReply({ text: chunk });
            await new Promise((r) => setTimeout(r, 500));
          }
        },
        onError: (err: unknown) => console.error("deliver error:", err),
      });
    
    await runtime.reply.withReplyDispatcher({
      dispatcher,
      run: () =>
        runtime.reply.dispatchReplyFromConfig({
          ctx: finalized,
          cfg: deps.config,
          dispatcher,
          replyOptions,
        }),
    });
    
    markDispatchIdle();
  };
}
