import type { Request } from "express";

export function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers["x-forwarded-for"];
  const firstForwarded =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim()
      : Array.isArray(forwardedFor)
        ? forwardedFor[0]?.split(",")[0]?.trim()
        : "";

  return (
    firstForwarded ||
    (typeof req.headers["x-real-ip"] === "string" ? req.headers["x-real-ip"] : "") ||
    req.ip ||
    req.socket.remoteAddress ||
    undefined
  );
}

export function isLocalIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const normalized = ip.replace(/^::ffff:/, "");
  return normalized === "127.0.0.1" || normalized === "::1" || normalized === "localhost";
}
