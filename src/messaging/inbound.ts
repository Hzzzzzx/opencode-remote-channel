export interface RemoteMessage {
  message: string;    // 消息内容
  peerId: string;     // 用户标识
  sessionId?: string; // 可选的会话 ID
}

export interface RemoteMsgContext {
  Body: string;
  From: string;
  To: string;
  AccountId: string;
  OriginatingChannel: "opencode-remote";
  OriginatingTo: string;
  MessageSid: string;
  Timestamp: number;
  Provider: "opencode-remote";
  ChatType: "direct";
  SessionKey?: string;
}

export function createInboundMessage(
  msg: RemoteMessage,
  accountId: string,
  channelId: "opencode-remote" = "opencode-remote"
): RemoteMsgContext {
  const from = msg.peerId;
  const sessionKey = msg.sessionId
    || `remote:${channelId}:${accountId}:${from}`;

  return {
    Body: msg.message,
    From: from,
    To: from, // 回复给自己
    AccountId: accountId,
    OriginatingChannel: channelId,
    OriginatingTo: from,
    MessageSid: generateMessageSid(),
    Timestamp: Date.now(),
    Provider: "opencode-remote",
    ChatType: "direct",
    SessionKey: sessionKey,
  };
}

function generateMessageSid(): string {
  return `remote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
