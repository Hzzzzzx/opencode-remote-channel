import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk";

import { remotePlugin } from "./src/channel.js";
import { RemoteConfigSchema } from "./src/config/config-schema.js";
import { setRemoteRuntime } from "./src/runtime.js";

const plugin = {
  id: "opencode-remote",
  name: "Remote",
  description: "Remote channel (HTTP/WebSocket) for controlling OpenCode",
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
