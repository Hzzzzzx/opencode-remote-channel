import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk";

import { wechatPlugin } from "./src/channel.js";
import { setRemoteRuntime } from "./src/runtime.js";

const plugin = {
  id: "opencode-wechat",
  name: "WeChat",
  description: "WeChat channel via ilink API for OpenCode",
  register(api: OpenClawPluginApi) {
    if (!api?.runtime) {
      throw new Error("[wechat] api.runtime is not available in register()");
    }
    setRemoteRuntime(api.runtime);

    api.registerChannel({ plugin: wechatPlugin });
  },
};

export default plugin;