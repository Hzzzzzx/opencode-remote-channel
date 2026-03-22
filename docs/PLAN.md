# OpenCode Remote Channel Plugin

## 项目概述

**目标**: 制作一个 Channel Plugin，实现远程控制 OpenCode 的功能。通过 HTTP/WebSocket 等协议，远程客户端可以发送消息给 OpenCode，OpenCode 处理后返回结果。

**参考**: 基于 `@tencent-weixin/openclaw-weixin` 插件的架构

## 核心功能

### 1. 消息入口
- [ ] HTTP Server 接收远程请求
- [ ] WebSocket 长连接支持（可选）
- [ ] 简单 Token 认证

### 2. 消息转换
- [ ] 将外部消息格式转换为 OpenCode 内部 `MsgContext`
- [ ] 支持文本消息
- [ ] 支持命令格式

### 3. 与 OpenCode 集成
- [ ] 实现 `ChannelPlugin` 接口
- [ ] 使用 `channelRuntime.reply.finalizeInboundContext()` 发送消息
- [ ] 处理 AI 回复并返回给客户端

### 4. 认证与安全
- [ ] Token-based 认证
- [ ] 配置化 token

## 技术方案

### 架构图

```
远程客户端 (curl / HTTP 请求)
         ↓ HTTP/WebSocket
远程 Channel Plugin
         ↓ 消息转换
OpenClaw Channel System
         ↓
AI Agent 处理
         ↓
返回结果给客户端
```

### 消息流程

1. **入站 (Remote → OpenCode)**
   - 客户端发送 HTTP POST 请求
   - 插件解析消息，转换为 MsgContext
   - 调用 `finalizeInboundContext()` 发送给 AI
   - AI 处理并生成回复

2. **出站 (OpenCode → Remote)**
   - AI 回复通过 `deliver()` 回调
   - 插件将回复转换为 HTTP 响应
   - 返回给客户端

## 项目结构

```
opencode-remote-channel/
├── index.ts                    # 插件入口
├── openclaw.plugin.json        # 插件清单
├── package.json
├── tsconfig.json
├── src/
│   ├── channel.ts             # ChannelPlugin 主定义
│   ├── runtime.ts             # 运行时管理
│   ├── server/
│   │   ├── http-server.ts    # HTTP Server
│   │   └── ws-server.ts      # WebSocket Server (可选)
│   ├── messaging/
│   │   ├── inbound.ts        # 消息转换
│   │   └── outbound.ts       # 消息发送
│   ├── auth/
│   │   └── token-auth.ts    # 认证
│   └── config/
│       └── config-schema.ts  # 配置 schema
├── docs/
│   └── PLAN.md              # 本文档
└── README.md
```

## 实现步骤

### Phase 1: 基础框架
1. [ ] 初始化项目结构
2. [ ] 配置 TypeScript 和依赖
3. [ ] 实现基本的 HTTP Server
4. [ ] 实现 Token 认证

### Phase 2: Channel Plugin 核心
5. [ ] 实现 `ChannelPlugin` 接口
6. [ ] 实现消息入站流程
7. [ ] 实现消息出站流程

### Phase 3: 完整功能
8. [ ] 支持多种消息类型
9. [ ] 添加配置管理
10. [ ] 添加错误处理和日志

### Phase 4: 测试与部署
11. [ ] 本地测试
12. [ ] 部署到 OpenCode

## 配置示例

```json
{
  "channels": {
    "opencode-remote": {
      "enabled": true,
      "port": 18888,
      "token": "your-secret-token",
      "path": "/api/chat"
    }
  }
}
```

## API 设计

### 发送消息

```
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "你好，帮我执行 xxx",
  "sessionId": "optional-session-id"
}
```

### 响应

```json
{
  "success": true,
  "reply": "AI 的回复内容",
  "sessionId": "session-123"
}
```

## 待讨论问题

1. **协议选择**: HTTP 轮询 vs WebSocket vs Server-Sent Events?
2. **会话管理**: 如何处理多用户/多会话?
3. **消息格式**: 是否需要支持结构化命令?
4. **部署方式**: 作为 OpenCode 插件还是独立服务?
5. **与 K 的结合**: 跟 K 相关的具体需求是什么?

## 相关文档

- [微信插件源码](../openclaw/extensions/openclaw-weixin/src/)
- [OpenCode Plugin SDK](https://github.com/modelcontextprotocol)
