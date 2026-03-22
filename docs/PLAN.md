# OpenCode Remote Channel Plugin

## 项目概述

**目标**: 通过微信远程控制 OpenCode，实现类似网页版的完整控制台功能。

**参考**: 基于 `@tencent-weixin/openclaw-weixin` 插件架构

---

## 核心功能需求

### 1. 实时对话
- [ ] 发送消息给 OpenCode AI
- [ ] 接收 AI 回复
- [ ] 支持多轮对话
- [ ] 支持图片/文件发送（参考微信插件）

### 2. 会话管理
- [ ] 列出当前会话列表
- [ ] 切换到指定会话
- [ ] 创建新会话
- [ ] 删除会话

### 3. Agent 控制
- [ ] 列出可用 Agent（如 opencode、openclaw 等）
- [ ] 切换当前 Agent
- [ ] 查看 Agent 状态

### 4. 模型控制
- [ ] 列出可用模型
- [ ] 切换当前模型
- [ ] 查看模型状态

### 5. 工作目录控制
- [ ] 查看当前工作目录
- [ ] 切换工作目录
- [ ] 列出目录内容

### 6. OpenCode 基础操作
- [ ] 查看状态
- [ ] 执行命令
- [ ] 文件操作
- [ ] 其他配置

---

## 技术方案

### 架构图

```
微信客户端
    ↓ 微信消息
微信插件 (已有)
    ↓
OpenCode Channel System
    ↓
AI 处理
    ↓
返回结果
```

### 消息命令设计

用户通过特定前缀区分命令类型：

```
/chat 你好，帮我写代码        → AI 对话
/list sessions              → 列出会话
/switch session-123         → 切换会话
/list agents                → 列出 Agent
/switch agent opencode      → 切换 Agent
/list models                → 列出模型
/switch model glm-5         → 切换模型
/pwd                        → 当前目录
/cd /path/to/dir            → 切换目录
/ls                         → 列出目录
/exec ls -la                → 执行命令
/help                       → 帮助
```

---

## 命令列表

### 对话命令
| 命令 | 说明 | 示例 |
|------|------|------|
| `/chat <消息>` | 与 AI 对话 | `/chat 帮我写一个 hello world` |
| 直接发送消息 | 快速对话 | `你好` |

### 会话管理
| 命令 | 说明 | 示例 |
|------|------|------|
| `/sessions` | 列出所有会话 | `/sessions` |
| `/switch <session>` | 切换会话 | `/switch abc123` |
| `/new` | 创建新会话 | `/new` |
| `/delete <session>` | 删除会话 | `/delete abc123` |

### Agent 管理
| 命令 | 说明 | 示例 |
|------|------|------|
| `/agents` | 列出可用 Agent | `/agents` |
| `/agent <name>` | 切换 Agent | `/agent opencode` |

### 模型管理
| 命令 | 说明 | 示例 |
|------|------|------|
| `/models` | 列出可用模型 | `/models` |
| `/model <name>` | 切换模型 | `/model glm-5` |

### 目录操作
| 命令 | 说明 | 示例 |
|------|------|------|
| `/pwd` | 当前目录 | `/pwd` |
| `/cd <path>` | 切换目录 | `/cd ~/project` |
| `/ls` | 列出目录 | `/ls` |

### 系统命令
| 命令 | 说明 | 示例 |
|------|------|------|
| `/help` | 帮助 | `/help` |
| `/status` | 状态 | `/status` |

---

## 实现步骤

### Phase 1: 基础框架
1. [x] 项目初始化
2. [ ] 命令解析器
3. [ ] 基础命令实现

### Phase 2: 核心功能
4. [ ] AI 对话集成
5. [ ] 会话管理
6. [ ] Agent 切换

### Phase 3: 扩展功能
7. [ ] 模型切换
8. [ ] 目录操作
9. [ ] 执行命令

### Phase 4: 测试
10. [ ] 本地测试
11. [ ] 微信端测试

---

## 项目结构

```
opencode-remote-channel/
├── index.ts                    # 插件入口
├── src/
│   ├── channel.ts             # ChannelPlugin 主定义
│   ├── commands/
│   │   ├── parser.ts         # 命令解析
│   │   ├── chat.ts           # 对话命令
│   │   ├── session.ts        # 会话命令
│   │   ├── agent.ts          # Agent 命令
│   │   ├── model.ts          # 模型命令
│   │   └── fs.ts             # 文件系统命令
│   └── ...
└── docs/
    └── PLAN.md
```

---

## 待讨论

1. 微信消息长度限制如何处理？
2. 是否需要支持快捷按钮？
3. 认证方式？（已有微信的登录机制）
