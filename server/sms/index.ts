/**
 * SMS notification module (Twilio Messages API)
 * Mirrors server/email/index.ts patterns.
 *
 * Uses TWILIO_FROM (separate from TWILIO_SERVICE_SID used for OTP).
 * Set SMS_ENABLED=false to disable all SMS without removing credentials.
 */

import twilio from "twilio";
import { logger } from "../lib/logger";

const SMS_ENABLED = process.env.SMS_ENABLED !== "false";
const TWILIO_FROM = process.env.TWILIO_FROM || "";

let twilioClient: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> | null {
  if (!SMS_ENABLED) return null;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    return null;
  }
  if (!twilioClient) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/** Normalize to E.164. Assumes Uzbek numbers if no country code. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+998${digits.slice(1)}`;
  if (digits.length === 9) return `+998${digits}`;
  // International: keep as-is with +
  return phone.startsWith("+") ? phone : `+${digits}`;
}

async function sendSms(to: string, text: string): Promise<boolean> {
  const client = getClient();
  if (!client) {
    logger.debug("SMS disabled or not configured — skipping", { source: "sms" });
    return false;
  }

  const normalized = normalizePhone(to);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await client.messages.create({
        from: TWILIO_FROM,
        to: normalized,
        body: text,
      });
      return true;
    } catch (err: any) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
      } else {
        logger.error("SMS send failed after 3 attempts", {
          source: "sms",
          meta: { to: normalized, error: String(err) },
        });
      }
    }
  }
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
  if (lang === "uz") {
    return `Salom, ${clientName}! Sizning ${serviceName} xizmati uchun yozuvingiz tasdiqlandi. Sana: ${date}, ${time}. AURELLE`;
  }
  if (lang === "en") {
    return `Hi ${clientName}! Your booking for ${serviceName} has been confirmed. Date: ${date} at ${time}. AURELLE`;
  }
  return `Здравствуйте, ${clientName}! Ваша запись на ${serviceName} подтверждена. Дата: ${date} в ${time}. AURELLE`;
}

function bookingCancelledText(
  clientName: string,
  serviceName: string,
  date: string,
  lang = "ru",
): string {
  if (lang === "uz") {
    return `${clientName}, ${date} sanasidagi ${serviceName} yozuvi bekor qilindi. AURELLE`;
  }
  if (lang === "en") {
    return `${clientName}, your booking for ${serviceName} on ${date} has been cancelled. AURELLE`;
  }
  return `${clientName}, ваша запись на ${serviceName} (${date}) отменена. AURELLE`;
}

function bookingRescheduledText(
  clientName: string,
  serviceName: string,
  newDate: string,
  newTime: string,
  lang = "ru",
): string {
  if (lang === "uz") {
    return `${clientName}, ${serviceName} yozuvingiz yangi sanaga ko'chirildi: ${newDate}, ${newTime}. AURELLE`;
  }
  if (lang === "en") {
    return `${clientName}, your booking for ${serviceName} was rescheduled to ${newDate} at ${newTime}. AURELLE`;
  }
  return `${clientName}, ваша запись на ${serviceName} перенесена: ${newDate} в ${newTime}. AURELLE`;
}

function bookingReminderText(
  clientName: string,
  serviceName: string,
  date: string,
  time: string,
  hoursUntil: number,
  lang = "ru",
): string {
  if (lang === "uz") {
    return `${clientName}, eslatma: ${serviceName} yozuvingiz ${hoursUntil} soatdan keyin. Sana: ${date}, ${time}. AURELLE`;
  }
  if (lang === "en") {
    return `${clientName}, reminder: your appointment for ${serviceName} is in ${hoursUntil} hours. ${date} at ${time}. AURELLE`;
  }
  return `${clientName}, напоминаем: запись на ${serviceName} через ${hoursUntil} ч. ${date} в ${time}. AURELLE`;
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
  return sendSms(phone, bookingCreatedText(clientName, serviceName, date, time, lang));
}

export async function sendBookingCancelledSms(
  phone: string,
  clientName: string,
  serviceName: string,
  date: string,
  lang = "ru",
): Promise<boolean> {
  return sendSms(phone, bookingCancelledText(clientName, serviceName, date, lang));
}

export async function sendBookingRescheduledSms(
  phone: string,
  clientName: string,
  serviceName: string,
  newDate: string,
  newTime: string,
  lang = "ru",
): Promise<boolean> {
  return sendSms(phone, bookingRescheduledText(clientName, serviceName, newDate, newTime, lang));
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
  );
}

export function isSmsEnabled(): boolean {
  return SMS_ENABLED && !!process.env.TWILIO_ACCOUNT_SID && !!TWILIO_FROM;
}
