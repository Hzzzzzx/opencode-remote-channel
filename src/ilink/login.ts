import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { QRCodeResponse, type AccountData, type QRStatus } from "../types/ilink-types.js";
import { fetchQRCode, pollQRStatus } from "./api.js";

const QR_POLL_INTERVAL_MS = 2_000;
const MAX_QR_WAIT_MS = 300_000;

export interface QrLoginResult {
  qrcode: QRCodeResponse;
  status: QRStatus;
  account: AccountData;
}

export async function doQRLogin(baseUrl: string): Promise<AccountData | null> {
  console.log("[ilink] 请求登录二维码...");
  const qrResp = await fetchQRCode(baseUrl);
  const qrcodeImg = qrResp.qrcode_img_content;
  console.log("\n========================================");
  console.log("请用微信扫描下方二维码登录:");
  console.log("========================================\n");
  if (qrcodeImg.startsWith("data:image")) {
    console.log("[二维码为 base64 图片，请在浏览器中打开]\n");
    console.log(qrcodeImg.slice(0, 100) + "...");
  } else {
    console.log(qrcodeImg);
  }
  console.log("\n========================================\n");
  const startTime = Date.now();
  while (Date.now() - startTime < MAX_QR_WAIT_MS) {
    const statusResp = await pollQRStatus(baseUrl, qrResp.qrcode);
    if (statusResp.status === "scaned") {
      console.log("[ilink] 已扫描，请在微信中确认...");
    } else if (statusResp.status === "confirmed") {
      console.log("[ilink] 登录成功!");
      const account: AccountData = {
        token: statusResp.bot_token ?? "",
        baseUrl: statusResp.baseurl ?? baseUrl,
        accountId: statusResp.ilink_bot_id ?? "unknown",
        userId: statusResp.ilink_user_id,
        savedAt: new Date().toISOString(),
      };
      saveCredentials(account);
      return account;
    } else if (statusResp.status === "expired") {
      console.error("[ilink] 二维码已过期，请重新登录");
      return null;
    }
    await sleep(QR_POLL_INTERVAL_MS);
  }
  console.error("[ilink] 登录超时");
  return null;
}

export function loadCredentials(): AccountData | null {
  try {
    const credPath = getCredentialsPath();
    if (fs.existsSync(credPath)) {
      const data = fs.readFileSync(credPath, "utf-8");
      return JSON.parse(data) as AccountData;
    }
  } catch {}
  return null;
}

function saveCredentials(account: AccountData): void {
  try {
    const credPath = getCredentialsPath();
    const dir = path.dirname(credPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(credPath, JSON.stringify(account, null, 2));
    console.log(`[ilink] 凭据已保存到 ${credPath}`);
  } catch (err) {
    console.error(`[ilink] 保存凭据失败: ${err}`);
  }
}

function getCredentialsPath(): string {
  return path.join(
    process.env.HOME ?? "/tmp",
    ".claude",
    "channels",
    "wechat",
    "account.json",
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}