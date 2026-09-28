function cleanSocialValue(value?: string | null) {
  if (!value) return "";
  return value.trim();
}

function stripExtras(value: string) {
  return value.replace(/[?#].*$/, "").replace(/\/+$/, "");
}

export function normalizeTelegramHandle(value?: string | null) {
  const cleaned = cleanSocialValue(value);
  if (!cleaned) return "";

  return stripExtras(
    cleaned
      .replace(/^https?:\/\/(www\.)?t\.me\//i, "")
      .replace(/^https?:\/\/telegram\.me\//i, "")
      .replace(/^tg:\/\//i, ""),
  ).replace(/^@+/, "");
}

export function normalizeInstagramHandle(value?: string | null) {
  const cleaned = cleanSocialValue(value);
  if (!cleaned) return "";

  return stripExtras(
    cleaned
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^https?:\/\/instagram\.com\//i, ""),
  ).replace(/^@+/, "");
}

export function buildTelegramUrl(value?: string | null) {
  const handle = normalizeTelegramHandle(value);
  return handle ? `https://t.me/${handle}` : "";
}

export function buildInstagramUrl(value?: string | null) {
  const handle = normalizeInstagramHandle(value);
  return handle ? `https://www.instagram.com/${handle}/` : "";
}

export function formatTelegramLabel(value?: string | null) {
  const handle = normalizeTelegramHandle(value);
  return handle ? `@${handle}` : "";
}

export function formatInstagramLabel(value?: string | null) {
  const handle = normalizeInstagramHandle(value);
  return handle ? `@${handle}` : "";
}
