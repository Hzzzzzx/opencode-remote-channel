/**
 * 系统命令处理器
 */

export interface SystemResult {
  type: 'pwd' | 'cd' | 'ls' | 'exec' | 'help';
  path?: string;
  entries?: Array<{ name: string; isDirectory: boolean }>;
  output?: string;
  message?: string;
}

export interface ExecRuntime {
  getCurrentDirectory: () => string;
  changeDirectory: (path: string) => Promise<string>;
  listDirectory: (path?: string) => Promise<Array<{ name: string; isDirectory: boolean }>>;
  executeCommand: (cmd: string) => Promise<string>;
}

export const HELP_MESSAGE = `
可用命令:
  /chat <msg>     - AI 对话
  /sessions       - 列出会话
  /switch <id>    - 切换会话
  /new            - 新建会话
  /delete <id>    - 删除会话
  /clear          - 清除上下文
  /agents         - 列 Agent
  /agent <name>   - 切换 Agent
  /models         - 列模型
  /model <name>   - 切换模型
  /pwd            - 当前目录
  /cd <path>      - 切换目录
  /ls             - 列目录
  /exec <cmd>     - 执行命令
  /help           - 显示帮助

直接发送消息将作为 AI 对话处理。
`;

/**
 * 处理系统命令
 */
export async function handleSystem(
  type: 'pwd' | 'cd' | 'ls' | 'exec' | 'help',
  body: string,
  runtime: ExecRuntime
): Promise<SystemResult> {
  switch (type) {
    case 'pwd': {
      const path = runtime.getCurrentDirectory();
      return { type: 'pwd', path };
    }

    case 'cd': {
      if (!body) {
        return { type: 'cd', message: '请提供目录路径' };
      }
      const newPath = await runtime.changeDirectory(body);
      return { type: 'cd', path: newPath };
    }

    case 'ls': {
      const entries = await runtime.listDirectory(body || undefined);
      return { type: 'ls', entries };
    }

    case 'exec': {
      if (!body) {
        return { type: 'exec', message: '请提供要执行的命令' };
      }
      const output = await runtime.executeCommand(body);
      return { type: 'exec', output };
    }

    case 'help': {
      return { type: 'help', message: HELP_MESSAGE };
    }

    default:
      return { type: type, message: '未知系统命令' };
  }
}
