/**
 * 配置 schema
 */

import { z } from "zod";

export const RemoteConfigSchema = z.object({
  port: z.number().default(18888).describe("HTTP server port"),
  token: z.string().describe("Authentication token"),
  path: z.string().default("/api/chat").describe("API endpoint path"),
  host: z.string().default("0.0.0.0").describe("HTTP server host"),
});

export type RemoteConfig = z.infer<typeof RemoteConfigSchema>;
