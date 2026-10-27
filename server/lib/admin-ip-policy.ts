import { normalizeIp } from "./request-ip";

export function adminIpPolicy(env: Record<string, string | undefined>) {
  const entries = (env.ADMIN_ALLOWED_IPS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const mode = env.ADMIN_IP_RESTRICTION;
  if (mode === "false") return { enabled: false, valid: true, allowed: new Set<string>() };
  const enabled = mode === "true" || entries.length > 0 || env.NODE_ENV === "production";
  const addresses = entries.map(normalizeIp);
  const valid =
    (mode === undefined || mode === "true") &&
    (!enabled || (addresses.length > 0 && addresses.every(Boolean)));
  return { enabled, valid, allowed: new Set(addresses.filter((ip): ip is string => !!ip)) };
}
