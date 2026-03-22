/**
 * Agent 切换处理器
 */

export interface AgentResult {
  type: 'agents' | 'agent';
  agents?: Array<{ name: string; description: string }>;
  currentAgent?: string;
  message?: string;
}

/**
 * 处理 Agent 相关命令
 */
export async function handleAgent(
  type: 'agents' | 'agent',
  body: string,
  runtime: {
    listAgents: () => Promise<Array<{ name: string; description: string }>>;
    getCurrentAgent: () => string;
    switchAgent: (name: string) => Promise<void>;
  }
): Promise<AgentResult> {
  switch (type) {
    case 'agents': {
      const agents = await runtime.listAgents();
      return { type: 'agents', agents };
    }

    case 'agent': {
      if (!body) {
        return { type: 'agent', currentAgent: runtime.getCurrentAgent() };
      }
      await runtime.switchAgent(body);
      return { type: 'agent', currentAgent: body };
    }

    default:
      return { type: type, message: '未知 Agent 命令' };
  }
}
