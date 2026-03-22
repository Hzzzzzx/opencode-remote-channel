/**
 * 命令解析器
 * 解析用户输入，识别命令类型
 */

export type CommandType =
  | 'chat'           // AI 对话
  | 'sessions'       // 列出会话
  | 'switch'         // 切换会话
  | 'new'            // 新建会话
  | 'delete'         // 删除会话
  | 'clear'          // 清除上下文
  | 'agents'         // 列 Agent
  | 'agent'          // 切换 Agent
  | 'models'         // 列模型
  | 'model'          // 切换模型
  | 'pwd'            // 当前目录
  | 'cd'             // 切换目录
  | 'ls'             // 列目录
  | 'exec'           // 执行命令
  | 'help';          // 帮助

export interface ParsedCommand {
  type: CommandType;
  raw: string;
  body: string;       // 命令参数或聊天内容
}

/**
 * 命令前缀映射
 */
const COMMAND_MAP: Record<string, CommandType> = {
  '/chat': 'chat',
  '/sessions': 'sessions',
  '/switch': 'switch',
  '/new': 'new',
  '/delete': 'delete',
  '/clear': 'clear',
  '/agents': 'agents',
  '/agent': 'agent',
  '/models': 'models',
  '/model': 'model',
  '/pwd': 'pwd',
  '/cd': 'cd',
  '/ls': 'ls',
  '/exec': 'exec',
  '/help': 'help',
};

/**
 * 解析命令文本
 * - 以 / 开头：解析为命令
 * - 其他情况：作为聊天消息处理
 */
export function parseCommand(text: string): ParsedCommand {
  const trimmed = text.trim();

  if (!trimmed.startsWith('/')) {
    // 非命令输入，作为聊天消息处理
    return {
      type: 'chat',
      raw: text,
      body: trimmed,
    };
  }

  // 解析命令
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    // 无参数的命令
    const cmd = trimmed.toLowerCase();
    const type = COMMAND_MAP[cmd];
    if (type) {
      return { type, raw: text, body: '' };
    }
  } else {
    // 有参数的命令
    const cmd = trimmed.slice(0, spaceIndex).toLowerCase();
    const body = trimmed.slice(spaceIndex + 1).trim();
    const type = COMMAND_MAP[cmd];
    if (type) {
      return { type, raw: text, body };
    }
  }

  // 未知命令，作为聊天处理
  return { type: 'chat', raw: text, body: trimmed };
}
