/**
 * 出站消息发送
 */

import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { logger } from "../util/logger.js";

interface OutboundParams {
  cfg: OpenClawConfig;
  to: string;
  text: string;
  accountId?: string | null;
}

export async function sendRemoteOutbound(
  params: OutboundParams,
): Promise<{ channel: string; messageId: string }> {
  const aLog = logger.withAccount(params.accountId ?? "default");
  aLog.debug(`sendRemoteOutbound: to=${params.to}, text=${params.text.slice(0, 50)}...`);

  // TODO: 实现实际的 HTTP 请求发送
  // 目前只是返回成功，实际需要根据具体架构实现

  return {
    channel: "openclaw-remote",
    messageId: `msg-${Date.now()}`,
  };
}
