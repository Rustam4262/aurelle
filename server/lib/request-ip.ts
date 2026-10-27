import type { Request } from "express";
import { isIP } from "node:net";

export function normalizeIp(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const ip = value.trim().replace(/^::ffff:/i, "");
  if (!isIP(ip)) return undefined;
  return isIP(ip) === 6 ? new URL(`http://[${ip}]/`).hostname.slice(1, -1) : ip;
}

export function getClientIp(req: Request): string | undefined {
  // Express resolves the proxy chain using the application's trusted-proxy
  // policy. Never independently trust headers supplied by the client.
  return normalizeIp(req.ip) ?? normalizeIp(req.socket.remoteAddress);
}

export function isLocalIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const normalized = ip.replace(/^::ffff:/, "");
  return normalized === "127.0.0.1" || normalized === "::1" || normalized === "localhost";
}
