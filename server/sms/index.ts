/**
 * SMS notification module (Twilio Messages API)
 *
 * Rules:
 *  - If SMS disabled/misconfigured → all sends return false, log debug
 *  - sendSms never throws — callers get Promise<boolean>
 *  - 3 retries with 1s/2s backoff on Twilio failures
 *  - Phone numbers logged as last-4 only (never full number)
 */

import twilio from "twilio";
import { logger } from "../lib/logger";
import { getSmsConfig, getSmsConfigStatus } from "../config/sms";

export { getSmsConfigStatus } from "../config/sms";

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: ReturnType<typeof twilio> | null = null;
let _initDone = false;

function getClient(): ReturnType<typeof twilio> | null {
  if (!_initDone) {
    _initDone = true;
    const cfg = getSmsConfig();
    if (cfg) {
      _client = twilio(cfg.accountSid, cfg.authToken);
    } else {
      const status = getSmsConfigStatus();
      logger.warn(`SMS disabled: ${status.reason}`, { source: "sms" });
    }
  }
  return _client;
}

export function isSmsEnabled(): boolean {
  return getSmsConfigStatus().enabled;
}

// ─── Phone normalization ──────────────────────────────────────────────────────

/** Normalize to E.164. Assumes Uzbek numbers if no country code. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+998${digits.slice(1)}`;
  if (digits.length === 9) return `+998${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

/** Return last 4 digits only for safe logging */
function maskPhone(normalized: string): string {
  return `***${normalized.slice(-4)}`;
}

// ─── Core send (3 retries) ────────────────────────────────────────────────────

async function sendSms(to: string, body: string, type = "sms"): Promise<boolean> {
  const client = getClient();
  if (!client) {
    logger.debug("SMS not configured — skipping", { source: "sms", meta: { type } });
    return false;
  }

  const cfg = getSmsConfig()!;
  const normalized = normalizePhone(to);
  const masked = maskPhone(normalized);

  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await client.messages.create({
        from: cfg.fromNumber,
        to: normalized,
        body,
      });
      logger.info("sms_sent", {
        source: "sms",
        meta: { type, to: masked, attempt },
      });
      return true;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }

  const errCode = (lastErr as any)?.code;
  logger.error("sms_failed", lastErr!, {
    source: "sms",
    meta: { type, to: masked, code: errCode },
  });
  return false;
}

// ─── Booking templates ────────────────────────────────────────────────────────

function bookingCreatedText(
  clientName: string,
  serviceName: string,
  date: string,
  time: string,
  lang = "ru",
): string {
  if (lang === "uz")
    return `Salom, ${clientName}! ${serviceName} uchun yozuvingiz tasdiqlandi. ${date}, ${time}. AURELLE`;
  if (lang === "en")
    return `Hi ${clientName}! Your booking for ${serviceName} is confirmed. ${date} at ${time}. AURELLE`;
  return `Здравствуйте, ${clientName}! Запись на ${serviceName} подтверждена. ${date} в ${time}. AURELLE`;
}

function bookingCancelledText(
  clientName: string,
  serviceName: string,
  date: string,
  lang = "ru",
): string {
  if (lang === "uz")
    return `${clientName}, ${date} sanasidagi ${serviceName} yozuvi bekor qilindi. AURELLE`;
  if (lang === "en")
    return `${clientName}, your booking for ${serviceName} on ${date} has been cancelled. AURELLE`;
  return `${clientName}, запись на ${serviceName} (${date}) отменена. AURELLE`;
}

function bookingRescheduledText(
  clientName: string,
  serviceName: string,
  newDate: string,
  newTime: string,
  lang = "ru",
): string {
  if (lang === "uz")
    return `${clientName}, ${serviceName} yozuvingiz ko'chirildi: ${newDate}, ${newTime}. AURELLE`;
  if (lang === "en")
    return `${clientName}, your ${serviceName} booking was rescheduled to ${newDate} at ${newTime}. AURELLE`;
  return `${clientName}, запись на ${serviceName} перенесена: ${newDate} в ${newTime}. AURELLE`;
}

function bookingReminderText(
  clientName: string,
  serviceName: string,
  date: string,
  time: string,
  hoursUntil: number,
  lang = "ru",
): string {
  if (lang === "uz")
    return `${clientName}, eslatma: ${serviceName} ${hoursUntil} soatdan keyin. ${date}, ${time}. AURELLE`;
  if (lang === "en")
    return `${clientName}, reminder: ${serviceName} in ${hoursUntil} hours. ${date} at ${time}. AURELLE`;
  return `${clientName}, напоминаем: ${serviceName} через ${hoursUntil} ч. ${date} в ${time}. AURELLE`;
}

// ─── Exported senders ─────────────────────────────────────────────────────────

export async function sendBookingCreatedSms(
  phone: string,
  clientName: string,
  serviceName: string,
  date: string,
  time: string,
  lang = "ru",
): Promise<boolean> {
  return sendSms(phone, bookingCreatedText(clientName, serviceName, date, time, lang), "booking_created");
}

export async function sendBookingCancelledSms(
  phone: string,
  clientName: string,
  serviceName: string,
  date: string,
  lang = "ru",
): Promise<boolean> {
  return sendSms(phone, bookingCancelledText(clientName, serviceName, date, lang), "booking_cancelled");
}

export async function sendBookingRescheduledSms(
  phone: string,
  clientName: string,
  serviceName: string,
  newDate: string,
  newTime: string,
  lang = "ru",
): Promise<boolean> {
  return sendSms(phone, bookingRescheduledText(clientName, serviceName, newDate, newTime, lang), "booking_rescheduled");
}

export async function sendBookingReminderSms(
  phone: string,
  clientName: string,
  serviceName: string,
  date: string,
  time: string,
  hoursUntil: number,
  lang = "ru",
): Promise<boolean> {
  return sendSms(
    phone,
    bookingReminderText(clientName, serviceName, date, time, hoursUntil, lang),
    `reminder_${hoursUntil}h`,
  );
}
