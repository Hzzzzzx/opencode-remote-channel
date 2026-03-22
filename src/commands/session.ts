/**
 * 会话管理处理器
 */

export interface SessionResult {
  type: 'sessions' | 'switch' | 'new' | 'delete' | 'clear';
  sessions?: Array<{ id: string; name: string; createdAt: Date }>;
  currentId?: string;
  deletedId?: string;
  message?: string;
}

/**
 * 处理会话相关命令
 */
export async function handleSessions(
  type: 'sessions' | 'switch' | 'new' | 'delete' | 'clear',
  body: string,
  runtime: {
    listSessions: () => Promise<Array<{ id: string; name: string; createdAt: Date }>>;
    getCurrentSessionId: () => string;
    createSession: () => Promise<string>;
    deleteSession: (id: string) => Promise<void>;
    switchSession: (id: string) => Promise<void>;
    clearContext: () => Promise<void>;
  }
): Promise<SessionResult> {
  switch (type) {
    case 'sessions': {
      const sessions = await runtime.listSessions();
      const currentId = runtime.getCurrentSessionId();
      return { type: 'sessions', sessions, currentId };
    }

    case 'switch': {
      if (!body) {
        return { type: 'switch', message: '请提供会话 ID' };
      }
      await runtime.switchSession(body);
      return { type: 'switch', currentId: body };
    }

    case 'new': {
      const id = await runtime.createSession();
      return { type: 'new', currentId: id };
    }

    case 'delete': {
      if (!body) {
        return { type: 'delete', message: '请提供会话 ID' };
      }
      await runtime.deleteSession(body);
      return { type: 'delete', deletedId: body };
    }

    case 'clear': {
      await runtime.clearContext();
      return { type: 'clear', message: '上下文已清除' };
    }

    default:
      return { type: type, message: '未知会话命令' };
  }
}
