/**
 * 运行时管理
 */

import type { PluginRuntime } from "openclaw/plugin-sdk";
import { logger } from "./util/logger.js";

let pluginRuntime: PluginRuntime | null = null;

export type PluginChannelRuntime = PluginRuntime["channel"];

export function setRemoteRuntime(next: PluginRuntime): void {
  pluginRuntime = next;
  logger.info(`[runtime] setRemoteRuntime called`);
}

export function getRemoteRuntime(): PluginRuntime {
  if (!pluginRuntime) {
    throw new Error("Remote runtime not initialized");
  }
  return pluginRuntime;
}

export async function waitForRemoteRuntime(
  timeoutMs = 10_000,
): Promise<PluginRuntime> {
  const start = Date.now();
  while (!pluginRuntime) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Remote runtime initialization timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return pluginRuntime;
}

export async function resolveRemoteChannelRuntime(params: {
  channelRuntime?: PluginChannelRuntime;
  waitTimeoutMs?: number;
}): Promise<PluginChannelRuntime> {
  if (params.channelRuntime) {
    return params.channelRuntime;
  }
  if (pluginRuntime) {
    return pluginRuntime.channel;
  }
  const pr = await waitForRemoteRuntime(params.waitTimeoutMs ?? 10_000);
  return pr.channel;
}
