# OpenCode Remote Channel - 详细实现方案

## 一、整体架构

```
微信消息 → 微信插件 → opencode-remote-channel → OpenCode AI → 回复
         (已有)         (新增)              (已有)
```

**核心原理**: 我们的插件作为"中间层"，接收微信消息，转换为 OpenCode 内部格式，发送给 AI，AI 回复后通过 deliver 回调发送回微信。

---

## 二、消息处理流程

### 入站流程 (微信 → OpenCode)

```
1. 微信消息到达
   ↓
2. 微信插件处理 (已有)
   ↓
3. 我们的 channel.ts 拦截消息
   ↓
4. 解析命令:
   - 如果是 /chat, /sessions 等命令 → 命令处理
   - 如果是普通消息 → 转换为 MsgContext
   ↓
5. 调用 channelRuntime.reply.finalizeInboundContext(ctx)
   ↓
6. 调用 channelRuntime.session.recordInboundSession({ sessionKey, ctx, ... })
   ↓
7. 调用 channelRuntime.reply.dispatchReplyFromConfig({ ctx, cfg, dispatcher, replyOptions })
   ↓
8. AI 处理，生成回复
   ↓
9. deliver() 回调被触发 → 发送回复到微信
```

### 出站流程 (OpenCode → 微信)

```
1. AI 生成回复
   ↓
2. deliver() 回调触发
   ↓
3. 我们调用 sendMessageWeixin() 发送消息
   ↓
4. 消息到达微信
```

---

## 三、MsgContext 结构

```typescript
interface MsgContext {
  Body: string;              // 消息内容
  From: string;               // 发送者 ID
  To: string;                 // 接收者 ID
  AccountId: string;          // 账户 ID
  OriginatingChannel: string;  // 渠道名 "opencode-remote"
  OriginatingTo: string;      // 原始接收者
  MessageSid: string;         // 消息 SID
  Timestamp?: number;         // 时间戳
  Provider: string;            // Provider 名
  ChatType: "direct";        // 聊天类型
  SessionKey?: string;        // Session 标识 (重要!)
  context_token?: string;     // 上下文 token
  MediaUrl?: string;         // 媒体 URL
  MediaPath?: string;        // 媒体路径
  MediaType?: string;        // 媒体类型
  CommandBody?: string;      // 命令内容
  CommandAuthorized?: boolean; // 是否授权命令
}
```

---

## 四、Session 管理机制

### SessionKey 格式
```
{agentId}:{channelId}:{accountId}:{peerId}
例如: main:opencode-remote:default:user123@remote
```

### Session 路由流程
```typescript
// 1. 解析 session key
const route = channelRuntime.routing.resolveAgentRoute({
  cfg: config,
  channel: "opencode-remote",
  accountId: "default",
  peer: { kind: "direct", id: "userId" },
});

// 2. 设置 session key 到 ctx
ctx.SessionKey = route.sessionKey;

// 3. 记录 session
channelRuntime.session.recordInboundSession({
  storePath: ...,
  sessionKey: route.sessionKey,
  ctx: finalized,
  ...
});
```

### 多轮对话实现
- **关键**: 保持 SessionKey 不变
- 每次消息使用相同的 sessionKey
- OpenCode 会自动维护该 session 的对话历史

---

## 五、命令解析设计

### 命令格式
```
/<command> [args]
```

### 解析器逻辑
```typescript
function parseCommand(text: string): { type: 'command' | 'chat', command?: string, args?: string, body: string } {
  if (text.startsWith('/')) {
    const [cmd, ...rest] = text.slice(1).split(' ');
    return { type: 'command', command: cmd, args: rest.join(' '), body: text };
  }
  return { type: 'chat', body: text };
}
```

### 命令列表
| 命令 | 处理函数 | 说明 |
|------|----------|------|
| `/chat <msg>` | handleChat() | AI 对话 |
| `/sessions` | handleSessions() | 列出会话 |
| `/switch <id>` | handleSwitch() | 切换会话 |
| `/new` | handleNew() | 新建会话 |
| `/delete <id>` | handleDelete() | 删除会话 |
| `/clear` | handleClear() | 清除上下文 |
| `/agents` | handleAgents() | 列 Agent |
| `/agent <name>` | handleAgentSwitch() | 切换 Agent |
| `/models` | handleModels() | 列模型 |
| `/model <name>` | handleModelSwitch() | 切换模型 |
| `/pwd` | handlePwd() | 当前目录 |
| `/cd <path>` | handleCd() | 切换目录 |
| `/ls` | handleLs() | 列目录 |
| `/exec <cmd>` | handleExec() | 执行命令 |
| `/help` | handleHelp() | 帮助 |

---

## 六、deliver 回调设计

```typescript
const { dispatcher, replyOptions, markDispatchIdle } = 
  channelRuntime.reply.createReplyDispatcherWithTyping({
    humanDelay: ...,
    typingCallbacks: {
      start: () => sendTypingIndicator(),
      stop: () => cancelTypingIndicator(),
    },
    deliver: async (payload) => {
      const text = payload.text ?? "";
      
      // 处理长文本分片
      if (text.length > 4000) {
        const chunks = splitTextIntoChunks(text, 4000);
        for (const chunk of chunks) {
          await sendMessageToWechat(chunk);
          await sleep(500); // 避免发送过快
        }
      } else {
        await sendMessageToWechat(text);
      }
    },
    onError: (err, info) => {
      // 错误处理
      sendErrorNotice(err.message);
    },
  });
```

### 长文本分片
```typescript
function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
```

---

## 七、实现文件结构

```
opencode-remote-channel/
├── index.ts                    # 插件入口
├── openclaw.plugin.json        # 插件清单
├── package.json
├── tsconfig.json
├── src/
│   ├── channel.ts             # ChannelPlugin 主定义
│   ├── runtime.ts             # 运行时管理
│   ├── commands/
│   │   ├── parser.ts         # 命令解析器
│   │   ├── chat.ts           # AI 对话处理
│   │   ├── session.ts         # 会话管理
│   │   ├── agent.ts          # Agent 控制
│   │   ├── model.ts          # 模型控制
│   │   └── system.ts         # 系统命令 (pwd/cd/ls/exec)
│   ├── messaging/
│   │   ├── inbound.ts         # 消息转换
│   │   ├── outbound.ts        # 消息发送
│   │   └── chunks.ts         # 长文本分片
│   ├── auth/
│   │   └── token-auth.ts     # Token 认证
│   ├── config/
│   │   └── config-schema.ts  # 配置 schema
│   └── util/
│       ├── logger.ts          # 日志
│       └── types.ts           # 类型定义
└── docs/
    └── IMPLEMENTATION.md      # 本文档
```

---

## 八、关键代码片段

### 1. ChannelPlugin 注册
```typescript
// index.ts
const plugin = {
  id: "opencode-remote",
  register(api: OpenClawPluginApi) {
    setRemoteRuntime(api.runtime);
    api.registerChannel({ plugin: remotePlugin });
  },
};
```

### 2. 入站消息处理
```typescript
// src/channel.ts
outbound: {
  deliveryMode: "direct",
  sendText: async (ctx) => {
    // 处理 AI 回复的发送
    return await sendRemoteOutbound({ ... });
  },
},
```

### 3. deliver 回调 (出站)
```typescript
// src/messaging/outbound.ts
deliver: async (payload) => {
  const text = payload.text ?? "";
  const chunks = splitTextIntoChunks(text, 4000);
  for (const chunk of chunks) {
    await sendMessageWechat(chunk);
  }
}
```

---

## 九、配置项

```json
{
  "channels": {
    "opencode-remote": {
      "enabled": true,
      "token": "your-secret-token",
      "defaultSession": true,
      "sessionDir": "~/.openclaw/sessions/opencode-remote"
    }
  }
}
```

---

## 十、实现步骤

### Phase 1: 基础框架
1. [x] 项目初始化
2. [ ] 实现 ChannelPlugin 骨架
3. [ ] 实现基本的 MsgContext 转换

### Phase 2: 核心功能
4. [ ] 命令解析器
5. [ ] 多轮对话支持
6. [ ] 消息发送 (deliver 回调)

### Phase 3: 命令实现
7. [ ] 会话命令 (/sessions, /switch, /new, /delete)
8. [ ] Agent/模型命令
9. [ ] 系统命令 (/pwd, /cd, /ls, /exec)

### Phase 4: 完善
10. [ ] 长文本分片
11. [ ] 错误处理
12. [ ] 测试

---

## 十一、关键技术点

### 1. 保持 Session 连续性
- 使用 `resolveAgentRoute` 获取固定的 sessionKey
- 同一用户的消息使用相同 sessionKey
- OpenCode 自动维护对话历史

### 2. 消息分片
- 微信限制 4000 字符
- 长回复需要分多次发送
- 每次发送间隔 500ms 避免频率限制

### 3. Token 认证
- 每个请求带 Bearer token
- 在 gateway 层验证

---

## 十二、待确认事项

1. ✅ Session 存储位置: 本地文件
2. ❓ 是否需要 session 过期机制 (待定)
3. ✅ 长文本分片: 分多次发送
4. ❓ 是否需要支持图片发送
5. ❓ 命令前缀是否固定为 `/`

---

## 十三、参考代码

微信插件源码位置:
- `/Users/hzz/.openclaw/extensions/openclaw-weixin/src/`
- `channel.ts` - ChannelPlugin 定义
- `messaging/process-message.ts` - 消息处理流程
- `messaging/inbound.ts` - MsgContext 转换
