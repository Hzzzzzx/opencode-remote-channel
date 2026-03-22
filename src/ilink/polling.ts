import * as fs from "node:fs";
import * as path from "node:path";
import {
  getUpdates,
  sendTextMessage,
  generateClientId,
  CHANNEL_NAME,
  CHANNEL_VERSION,
} from "./api.js";
import { parseMessage } from "./message.js";
import type { AccountData, ParsedMessage } from "../types/ilink-types.js";

const MAX_CONSECUTIVE_FAILURES = 5;
const BACKOFF_DELAY_MS = 30_000;
const RETRY_DELAY_MS = 1_000;
const MAX_MESSAGE_TEXT_LEN = 200;

export interface IlinkPollingDeps {
  account: AccountData;
  onMessage: (msg: ParsedMessage) => Promise<void>;
  onError?: (err: unknown) => void;
}

export async function startPolling(deps: IlinkPollingDeps): Promise<void> {
  const { account, onMessage, onError } = deps;
  const { baseUrl, token } = account;
  let getUpdatesBuf = loadSyncBuffer();
  if (getUpdatesBuf) {
    console.log(`[ilink] 恢复上次同步状态 (${getUpdatesBuf.length} bytes)`);
  }
  console.log("[ilink] 开始监听微信消息...");
  let consecutiveFailures = 0;
  while (true) {
    try {
      const resp = await getUpdates(baseUrl, token, getUpdatesBuf, CHANNEL_VERSION);
      const isError =
        (resp.ret !== undefined && resp.ret !== 0) ||
        (resp.errcode !== undefined && resp.errcode !== 0);
      if (isError) {
        consecutiveFailures++;
        console.error(
          `[ilink] getUpdates 失败: ret=${resp.ret} errcode=${resp.errcode} errmsg=${resp.errmsg ?? ""}`,
        );
        await sleep(
          consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
            ? BACKOFF_DELAY_MS
            : RETRY_DELAY_MS,
        );
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          consecutiveFailures = 0;
        }
        continue;
      }
      consecutiveFailures = 0;
      if (resp.get_updates_buf) {
        getUpdatesBuf = resp.get_updates_buf;
        saveSyncBuffer(getUpdatesBuf);
      }
      for (const msg of resp.msgs ?? []) {
        const parsed = parseMessage(msg);
        if (!parsed) continue;
        console.log(
          `[ilink] 收到消息: from=${parsed.senderId} text=${parsed.text.slice(0, MAX_MESSAGE_TEXT_LEN)}...`,
        );
        try {
          await onMessage(parsed);
        } catch (err) {
          console.error(`[ilink] 处理消息失败: ${String(err)}`);
          onError?.(err);
        }
      }
    } catch (err) {
      consecutiveFailures++;
      console.error(`[ilink] 轮询异常: ${String(err)}`);
      await sleep(
        consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
          ? BACKOFF_DELAY_MS
          : RETRY_DELAY_MS,
      );
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        consecutiveFailures = 0;
      }
    }
  }
}

export async function sendReply(
  account: AccountData,
  parsed: ParsedMessage,
  text: string,
): Promise<void> {
  const clientId = generateClientId();
  if (parsed.contextToken) {
    await sendTextMessage(
      account.baseUrl,
      account.token,
      parsed.senderId,
      text,
      parsed.contextToken,
      clientId,
      CHANNEL_VERSION,
    );
    console.log("[ilink] 已发送回复");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const SYNC_BUFFER_PATH = path.join(
  process.env.HOME ?? "/tmp",
  ".claude",
  "channels",
  "wechat",
  "sync_buffer.json",
);

function loadSyncBuffer(): string {
  try {
    if (fs.existsSync(SYNC_BUFFER_PATH)) {
      return fs.readFileSync(SYNC_BUFFER_PATH, "utf-8");
    }
  } catch {}
  return "";
}

function saveSyncBuffer(buf: string): void {
  try {
    const dir = path.dirname(SYNC_BUFFER_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SYNC_BUFFER_PATH, buf);
  } catch {}
}