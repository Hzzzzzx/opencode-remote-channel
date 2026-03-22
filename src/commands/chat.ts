/**
 * AI 对话处理器
 */

export interface ChatResult {
  type: 'chat';
  message: string;
}

/**
 * 处理 AI 对话
 */
export function handleChat(body: string): ChatResult {
  return {
    type: 'chat',
    message: body,
  };
}
