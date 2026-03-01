/**
 * Email service — SMTP transport with graceful degradation.
 *
 * Rules:
 *  - If email is disabled/misconfigured → all sends return false, log warn
 *  - sendEmail never throws — callers get Promise<boolean>
 *  - 3 retries with 1s/2s backoff on SMTP failures
 *  - verifyTransport() result is cached for 60s to avoid SMTP spam
 */

import nodemailer from "nodemailer";
import { logger } from "../lib/logger";
import { getEmailConfig, getEmailConfigStatus } from "../config/email";

export { getEmailConfigStatus } from "../config/email";

// ─── Transport singleton ──────────────────────────────────────────────────────

// Use ReturnType to avoid nodemailer generic type incompatibilities
type MailTransporter = ReturnType<typeof nodemailer.createTransport>;
let _transporter: MailTransporter | null = null;
let _initDone = false;

function getTransporter(): MailTransporter | null {
  return _transporter;
}

export function initializeEmail(): void {
  if (_initDone) return;
  _initDone = true;

  const cfg = getEmailConfig();
  const status = getEmailConfigStatus();

  if (!cfg) {
    logger.warn(`Email disabled: ${status.reason}`, { source: "email-service" });
    return;
  }

  try {
    // Type assertion needed: nodemailer overload resolution returns a narrower type
    // than ReturnType<typeof nodemailer.createTransport> for SMTP options.
    _transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      requireTLS: cfg.requireTLS,
      auth: { user: cfg.user, pass: cfg.password },
    }) as unknown as MailTransporter;
    logger.info(
      `Email service initialized (${cfg.host}:${cfg.port}, secure=${cfg.secure})`,
      { source: "email-service" },
    );
  } catch (err) {
    logger.error("Failed to create email transporter", err as Error, {
      source: "email-service",
    });
  }
}

export function isEmailConfigured(): boolean {
  return _transporter !== null;
}

// ─── Verify (cached 60s) ─────────────────────────────────────────────────────

let _verifyCache: { ok: boolean; ts: number } | null = null;
const VERIFY_TTL_MS = 60_000;

export async function verifyTransport(): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;

  const now = Date.now();
  if (_verifyCache && now - _verifyCache.ts < VERIFY_TTL_MS) {
    return _verifyCache.ok;
  }

  try {
    await t.verify();
    _verifyCache = { ok: true, ts: now };
    logger.info("SMTP transport verified", { source: "email-service" });
    return true;
  } catch (err) {
    _verifyCache = { ok: false, ts: now };
    logger.error("SMTP transport verification failed", err as Error, { source: "email-service" });
    return false;
  }
}

// ─── Core send (3 retries) ───────────────────────────────────────────────────

export interface SendResult {
  ok: boolean;
  messageId?: string;
  disabled?: boolean;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<boolean> {
  const result = await sendEmailDetailed(to, subject, html, text);
  return result.ok;
}

export async function sendEmailDetailed(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<SendResult> {
  const cfg = getEmailConfig();
  const t = getTransporter();

  if (!cfg || !t) {
    const status = getEmailConfigStatus();
    logger.warn("email_disabled", {
      source: "email-service",
      meta: { reason: status.reason, to, subject },
    });
    return { ok: false, disabled: true };
  }

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const info = await t.sendMail({
        from: cfg.from,
        to,
        subject,
        html,
        text: text ?? stripHtml(html),
      });
      logger.info("email_sent", {
        source: "email-service",
        meta: { to, subject, messageId: info.messageId as string, attempt },
      });
      return { ok: true, messageId: info.messageId as string };
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        await sleep(attempt * 1_000);
      }
    }
  }

  const errCode = (lastErr as NodeJS.ErrnoException)?.code;
  logger.error("email_failed", lastErr!, {
    source: "email-service",
    meta: { to, subject, code: errCode },
  });
  return { ok: false, error: lastErr?.message };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── App URL helper ───────────────────────────────────────────────────────────

const APP_URL = (): string => process.env.APP_URL || "https://aurelle.uz";

// ─── Email templates ──────────────────────────────────────────────────────────

interface BookingConfirmationData {
  clientName: string;
  salonName: string;
  serviceName: string;
  masterName: string | null;
  date: string;
  time: string;
  price: number;
  bookingId: string;
}

export async function sendBookingConfirmation(
  email: string,
  data: BookingConfirmationData,
  language = "ru",
): Promise<boolean> {
  const T = bookingT(language);
  const html = bookingHtml("667eea", "764ba2", `
    <div class="greeting">${T.greeting}, ${data.clientName}!</div>
    <div class="title">✨ ${T.confirmTitle}</div>
    ${detailsTable([
      [T.salon, data.salonName],
      [T.service, data.serviceName],
      [T.master, data.masterName ?? T.anyMaster],
      [T.date, data.date],
      [T.time, data.time],
      [T.price, `${data.price.toLocaleString()} UZS`],
    ])}
    <div class="info-box">ℹ️ ${T.arriveNote}</div>
    <div style="text-align:center"><a href="${APP_URL()}/profile" class="btn">${T.viewBooking}</a></div>
  `);
  return sendEmail(email, T.confirmSubject, html);
}

interface BookingCancellationData {
  clientName: string;
  salonName: string;
  serviceName: string;
  date: string;
  time: string;
}

export async function sendBookingCancellation(
  email: string,
  data: BookingCancellationData,
  language = "ru",
): Promise<boolean> {
  const T = bookingT(language);
  const html = bookingHtml("f093fb", "f5576c", `
    <div class="greeting">${T.greeting}, ${data.clientName}!</div>
    <div class="title" style="color:#f5576c">❌ ${T.cancelTitle}</div>
    ${detailsTable([
      [T.salon, data.salonName],
      [T.service, data.serviceName],
      [T.date, data.date],
      [T.time, data.time],
    ])}
    <div class="info-box" style="background:#fff3cd;border-color:#ffc107;color:#856404">ℹ️ ${T.cancelNote}</div>
    <div style="text-align:center"><a href="${APP_URL()}" class="btn">${T.bookAgain}</a></div>
  `);
  return sendEmail(email, T.cancelSubject, html);
}

interface BookingReminderData {
  clientName: string;
  salonName: string;
  serviceName: string;
  masterName: string | null;
  date: string;
  time: string;
  hoursUntil: number;
}

export async function sendBookingReminder(
  email: string,
  data: BookingReminderData,
  language = "ru",
): Promise<boolean> {
  const T = bookingT(language);
  const html = bookingHtml("fa709a", "fee140", `
    <div class="greeting">${T.greeting}, ${data.clientName}!</div>
    <div class="title" style="color:#fa709a">⏰ ${T.reminderTitle}</div>
    <div style="background:linear-gradient(135deg,#fa709a,#fee140);color:white;padding:15px;border-radius:6px;text-align:center;font-size:20px;font-weight:600;margin:20px 0">
      ${T.inHours(data.hoursUntil)}
    </div>
    ${detailsTable([
      [T.salon, data.salonName],
      [T.service, data.serviceName],
      [T.master, data.masterName ?? T.anyMaster],
      [T.date, data.date],
      [T.time, data.time],
    ])}
    <div class="info-box" style="background:#d4edda;border-color:#28a745;color:#155724">ℹ️ ${T.arriveNote}</div>
    <div style="text-align:center"><a href="${APP_URL()}/profile" class="btn">${T.viewBooking}</a></div>
  `);
  return sendEmail(email, T.reminderSubject, html);
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  language = "ru",
): Promise<boolean> {
  const subjects: Record<string, string> = {
    ru: "Сброс пароля — AURELLE",
    uz: "Parolni tiklash — AURELLE",
    en: "Password Reset — AURELLE",
  };
  const bodies: Record<string, string> = {
    ru: `<h2>Сброс пароля</h2><p>Мы получили запрос на сброс пароля вашего аккаунта AURELLE.</p>
         <div style="text-align:center;margin:24px 0"><a href="${resetLink}" style="display:inline-block;background:#667eea;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600">Сбросить пароль</a></div>
         <p style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px;color:#555;font-size:14px">Ссылка действительна 1 час. Если вы не запрашивали сброс — проигнорируйте письмо.</p>`,
    uz: `<h2>Parolni tiklash</h2><p>AURELLE hisobingiz parolini tiklash so'rovi qabul qilindi.</p>
         <div style="text-align:center;margin:24px 0"><a href="${resetLink}" style="display:inline-block;background:#667eea;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600">Parolni tiklash</a></div>
         <p style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px;color:#555;font-size:14px">Havola 1 soat davomida amal qiladi.</p>`,
    en: `<h2>Password Reset</h2><p>We received a request to reset your AURELLE account password.</p>
         <div style="text-align:center;margin:24px 0"><a href="${resetLink}" style="display:inline-block;background:#667eea;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600">Reset Password</a></div>
         <p style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px;color:#555;font-size:14px">Link valid for 1 hour. Ignore if you didn't request a reset.</p>`,
  };

  const subject = subjects[language] ?? subjects.ru;
  const body = bodies[language] ?? bodies.ru;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#f5f5f5}
.wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.hdr{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:30px;text-align:center}
.hdr h1{margin:0;font-size:28px;font-weight:300}.body{padding:30px;color:#333}
.ftr{text-align:center;padding:20px;color:#6c757d;font-size:13px}</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>AURELLE</h1></div>
  <div class="body">${body}</div>
  <div class="ftr"><a href="${APP_URL()}" style="color:#667eea;text-decoration:none">aurelle.uz</a></div>
</div></body></html>`;

  return sendEmail(email, subject, html);
}

export async function sendUserBlockedEmail(
  userEmail: string,
  userName: string,
  reason: string,
  adminName: string,
): Promise<boolean> {
  const html = adminEmailHtml("⚠️ Account Suspended", "#dc3545", `
    <p>Dear ${userName},</p>
    <p>Your AURELLE account has been temporarily suspended.</p>
    <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0"><strong>Reason:</strong> ${reason}</div>
    <p>To appeal, contact <a href="mailto:support@aurelle.uz">support@aurelle.uz</a></p>
    <p style="color:#6c757d;font-size:13px">Suspended by: ${adminName} · ${new Date().toLocaleDateString()}</p>
  `);
  return sendEmail(userEmail, "Your AURELLE Account Has Been Suspended", html);
}

export async function sendUserUnblockedEmail(
  userEmail: string,
  userName: string,
  adminName: string,
): Promise<boolean> {
  const html = adminEmailHtml("✅ Account Reinstated", "#28a745", `
    <p>Dear ${userName},</p>
    <div style="background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0">
      Your AURELLE account suspension has been lifted. You now have full access.
    </div>
    <a href="${APP_URL()}" style="display:inline-block;background:#28a745;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin:20px 0">Log In to AURELLE</a>
    <p style="color:#6c757d;font-size:13px">Reinstated by: ${adminName} · ${new Date().toLocaleDateString()}</p>
  `);
  return sendEmail(userEmail, "Your AURELLE Account Has Been Reinstated", html);
}

// ─── Template helpers ─────────────────────────────────────────────────────────

interface BookingTranslations {
  greeting: string; confirmSubject: string; cancelSubject: string; reminderSubject: string;
  confirmTitle: string; cancelTitle: string; reminderTitle: string;
  salon: string; service: string; master: string; date: string; time: string; price: string;
  anyMaster: string; arriveNote: string; cancelNote: string; viewBooking: string; bookAgain: string;
  inHours: (h: number) => string;
}

function bookingT(lang: string): BookingTranslations {
  const map: Record<string, BookingTranslations> = {
    ru: {
      greeting: "Здравствуйте", confirmSubject: "Подтверждение записи — AURELLE",
      cancelSubject: "Запись отменена — AURELLE", reminderSubject: "Напоминание о записи — AURELLE",
      confirmTitle: "Ваша запись подтверждена!", cancelTitle: "Ваша запись отменена",
      reminderTitle: "Скоро ваш визит!", salon: "Салон", service: "Услуга",
      master: "Мастер", date: "Дата", time: "Время", price: "Цена",
      anyMaster: "Любой свободный мастер",
      arriveNote: "Пожалуйста, приходите за 5 минут до начала. Отмена — минимум за 24 часа.",
      cancelNote: "Ваша запись успешно отменена. Надеемся увидеть вас снова!",
      viewBooking: "Посмотреть запись", bookAgain: "Записаться снова",
      inHours: (h) => `через ${h} ч`,
    },
    uz: {
      greeting: "Assalomu alaykum", confirmSubject: "Yozilish tasdiqlandi — AURELLE",
      cancelSubject: "Yozilish bekor qilindi — AURELLE", reminderSubject: "Yozilish eslatmasi — AURELLE",
      confirmTitle: "Yozilishingiz tasdiqlandi!", cancelTitle: "Yozilishingiz bekor qilindi",
      reminderTitle: "Tez orada uchrashuvingiz!", salon: "Salon", service: "Xizmat",
      master: "Usta", date: "Sana", time: "Vaqt", price: "Narx",
      anyMaster: "Har qanday bo'sh usta",
      arriveNote: "Iltimos, 5 daqiqa oldin keling. Bekor qilish — kamida 24 soat oldin.",
      cancelNote: "Yozilishingiz muvaffaqiyatli bekor qilindi!",
      viewBooking: "Yozilishni ko'rish", bookAgain: "Qayta yozilish",
      inHours: (h) => `${h} soatdan keyin`,
    },
    en: {
      greeting: "Hello", confirmSubject: "Booking Confirmation — AURELLE",
      cancelSubject: "Booking Cancelled — AURELLE", reminderSubject: "Booking Reminder — AURELLE",
      confirmTitle: "Your booking is confirmed!", cancelTitle: "Your booking has been cancelled",
      reminderTitle: "Your appointment is coming up!", salon: "Salon", service: "Service",
      master: "Master", date: "Date", time: "Time", price: "Price",
      anyMaster: "Any available master",
      arriveNote: "Please arrive 5 minutes early. Cancellations must be made 24h in advance.",
      cancelNote: "Your booking has been successfully cancelled. Hope to see you soon!",
      viewBooking: "View Booking", bookAgain: "Book Again",
      inHours: (h) => `in ${h} hours`,
    },
  };
  return map[lang] ?? map.ru;
}

function detailsTable(rows: [string, string][]): string {
  const cells = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px;color:#6c757d;font-weight:500;border-bottom:1px solid #e9ecef">${label}</td>
      <td style="padding:10px;color:#212529;font-weight:600;border-bottom:1px solid #e9ecef;text-align:right">${value}</td>
    </tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;background:#f8f9fa;border-radius:6px;margin:20px 0">${cells}</table>`;
}

function bookingHtml(c1: string, c2: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#f5f5f5}
.wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.hdr{background:linear-gradient(135deg,#${c1},#${c2});color:#fff;padding:30px;text-align:center}
.hdr h1{margin:0;font-size:28px;font-weight:300}
.body{padding:30px;color:#333}
.greeting{font-size:18px;margin-bottom:20px}
.title{font-size:22px;font-weight:600;margin-bottom:20px;color:#${c1}}
.info-box{background:#e7f3ff;border-left:4px solid #2196f3;padding:15px;margin:20px 0;color:#0c5460}
.btn{display:inline-block;background:#667eea;color:#fff;padding:12px 30px;text-decoration:none;border-radius:6px;margin:20px 0;font-weight:600}
.ftr{text-align:center;padding:20px;color:#6c757d;font-size:13px}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>AURELLE</h1></div>
  <div class="body">${body}</div>
  <div class="ftr"><a href="${APP_URL()}" style="color:#667eea;text-decoration:none">aurelle.uz</a></div>
</div></body></html>`;
}

function adminEmailHtml(heading: string, accentColor: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#f5f5f5}
.wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.hdr{background:${accentColor};color:#fff;padding:30px;text-align:center}
.hdr h1{margin:0;font-size:24px}.body{padding:30px;color:#333}
.ftr{text-align:center;padding:20px;color:#6c757d;font-size:13px}</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>${heading}</h1></div>
  <div class="body">${body}</div>
  <div class="ftr"><a href="${APP_URL()}" style="color:#667eea;text-decoration:none">aurelle.uz</a></div>
</div></body></html>`;
}
