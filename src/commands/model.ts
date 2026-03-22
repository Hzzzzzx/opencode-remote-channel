/**
 * 模型切换处理器
 */

export interface ModelResult {
  type: 'models' | 'model';
  models?: Array<{ name: string; description: string }>;
  currentModel?: string;
  message?: string;
}

/**
 * 处理模型相关命令
 */
export async function handleModel(
  type: 'models' | 'model',
  body: string,
  runtime: {
    listModels: () => Promise<Array<{ name: string; description: string }>>;
    getCurrentModel: () => string;
    switchModel: (name: string) => Promise<void>;
  }
): Promise<ModelResult> {
  switch (type) {
    case 'models': {
      const models = await runtime.listModels();
      return { type: 'models', models };
    }

    case 'model': {
      if (!body) {
        return { type: 'model', currentModel: runtime.getCurrentModel() };
      }
      await runtime.switchModel(body);
      return { type: 'model', currentModel: body };
    }

    default:
      return { type: type, message: '未知模型命令' };
  }
}
