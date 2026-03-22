/**
 * OpenClaw Remote Channel Plugin
 * 
 * 远程控制 OpenClaw 的 Channel Plugin
 * 通过 HTTP/WebSocket 接收远程消息，与 OpenClaw AI 交互
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk";

import { remotePlugin } from "./src/channel.js";
import { RemoteConfigSchema } from "./src/config/config-schema.js";
import { setRemoteRuntime } from "./src/runtime.js";

const plugin = {
  id: "openclaw-remote",
  name: "Remote",
  description: "Remote channel (HTTP/WebSocket) for controlling OpenClaw",
  configSchema: buildChannelConfigSchema(RemoteConfigSchema),
  register(api: OpenClawPluginApi) {
    if (!api?.runtime) {
      throw new Error("[remote] api.runtime is not available in register()");
    }
    setRemoteRuntime(api.runtime);

    api.registerChannel({ plugin: remotePlugin });
  },
};

export default plugin;
