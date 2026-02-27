import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "../lib/logger";

// Email configuration from environment variables
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== "false"; // default true; set EMAIL_ENABLED=false to disable
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_SECURE = process.env.EMAIL_PORT === "465";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const APP_URL = process.env.APP_URL || "https://aurelle.uz";

let transporter: Transporter | null = null;

// Initialize email transporter
export function initializeEmail(): void {
  if (!EMAIL_ENABLED) {
    logger.info("Email disabled via EMAIL_ENABLED=false");
    return;
  }
  if (!EMAIL_USER || !EMAIL_PASS) {
    logger.warn("⚠️  Email not configured - EMAIL_USER or EMAIL_PASSWORD missing");
    return;
  }

  try {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    logger.info("✅ Email system initialized");
  } catch (error) {
    logger.error("❌ Failed to initialize email", error);
  }
}

// Check if email is configured and enabled
export function isEmailConfigured(): boolean {
  return EMAIL_ENABLED && transporter !== null;
}

// Internal send with retry (3 attempts, 1s/2s backoff)
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!EMAIL_ENABLED) {
    logger.debug("Email disabled, skipping send", { meta: { subject } });
    return false;
  }
  if (!transporter) {
    logger.warn("Email not configured, skipping email send", { meta: { to, subject } });
    return false;
  }

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
      logger.info(`📧 Email sent to ${to}: ${subject}`);
      return true;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 1000)); // 1s, 2s backoff
      }
    }
  }
  logger.error(`Failed to send email to ${to} after 3 attempts`, lastError!, { source: "email" });
  return false;
}

// Email templates

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
  language: string = "en",
): Promise<boolean> {
  const translations = {
    en: {
      subject: "Booking Confirmation - AURELLE",
      greeting: "Hello",
      title: "Your booking has been confirmed!",
      details: "Booking Details",
      salon: "Salon",
      service: "Service",
      master: "Master",
      date: "Date",
      time: "Time",
      price: "Price",
      anyMaster: "Any available master",
      instructions:
        "Please arrive 5 minutes early. If you need to cancel or reschedule, please do so at least 24 hours in advance.",
      viewBooking: "View Booking",
      footer: "Thank you for choosing AURELLE!",
    },
    ru: {
      subject: "Подтверждение записи - AURELLE",
      greeting: "Здравствуйте",
      title: "Ваша запись подтверждена!",
      details: "Детали записи",
      salon: "Салон",
      service: "Услуга",
      master: "Мастер",
      date: "Дата",
      time: "Время",
      price: "Цена",
      anyMaster: "Любой свободный мастер",
      instructions:
        "Пожалуйста, приходите за 5 минут до начала. Если вам нужно отменить или перенести запись, сделайте это минимум за 24 часа.",
      viewBooking: "Посмотреть запись",
      footer: "Спасибо, что выбрали AURELLE!",
    },
    uz: {
      subject: "Yozilish tasdiqlandi - AURELLE",
      greeting: "Assalomu alaykum",
      title: "Yozilishingiz tasdiqlandi!",
      details: "Yozilish tafsilotlari",
      salon: "Salon",
      service: "Xizmat",
      master: "Usta",
      date: "Sana",
      time: "Vaqt",
      price: "Narx",
      anyMaster: "Har qanday bo'sh usta",
      instructions:
        "Iltimos, 5 daqiqa oldin keling. Agar bekor qilish yoki o'zgartirish kerak bo'lsa, kamida 24 soat oldin qiling.",
      viewBooking: "Yozilishni ko'rish",
      footer: "AURELLE ni tanlaganingiz uchun rahmat!",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 30px; }
        .greeting { color: #333; font-size: 18px; margin-bottom: 20px; }
        .title { color: #667eea; font-size: 24px; font-weight: 600; margin-bottom: 20px; }
        .details { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #6c757d; font-weight: 500; }
        .detail-value { color: #212529; font-weight: 600; }
        .price { color: #667eea; font-size: 20px; }
        .instructions { background: #e7f3ff; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; color: #0c5460; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        .footer-logo { color: #667eea; font-weight: 600; font-size: 18px; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AURELLE</h1>
        </div>
        <div class="content">
          <div class="greeting">${t.greeting}, ${data.clientName}!</div>
          <div class="title">✨ ${t.title}</div>

          <div class="details">
            <h3 style="margin-top: 0; color: #667eea;">${t.details}</h3>
            <div class="detail-row">
              <span class="detail-label">${t.salon}:</span>
              <span class="detail-value">${data.salonName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.service}:</span>
              <span class="detail-value">${data.serviceName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.master}:</span>
              <span class="detail-value">${data.masterName || t.anyMaster}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.date}:</span>
              <span class="detail-value">${data.date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.time}:</span>
              <span class="detail-value">${data.time}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.price}:</span>
              <span class="detail-value price">${data.price.toLocaleString()} UZS</span>
            </div>
          </div>

          <div class="instructions">
            ℹ️ ${t.instructions}
          </div>

          <div style="text-align: center;">
            <a href="${APP_URL}/profile" class="button">${t.viewBooking}</a>
          </div>
        </div>
        <div class="footer">
          <div class="footer-logo">AURELLE</div>
          <div>${t.footer}</div>
          <div style="margin-top: 10px;">
            <a href="${APP_URL}" style="color: #667eea; text-decoration: none;">aurelle.uz</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, t.subject, html);
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
  language: string = "en",
): Promise<boolean> {
  const translations = {
    en: {
      subject: "Booking Cancelled - AURELLE",
      greeting: "Hello",
      title: "Your booking has been cancelled",
      details: "Cancelled Booking Details",
      salon: "Salon",
      service: "Service",
      date: "Date",
      time: "Time",
      message: "Your booking has been successfully cancelled. We hope to see you again soon!",
      bookAgain: "Book Again",
      footer: "Thank you for using AURELLE!",
    },
    ru: {
      subject: "Запись отменена - AURELLE",
      greeting: "Здравствуйте",
      title: "Ваша запись отменена",
      details: "Детали отменённой записи",
      salon: "Салон",
      service: "Услуга",
      date: "Дата",
      time: "Время",
      message: "Ваша запись успешно отменена. Надеемся увидеть вас снова!",
      bookAgain: "Записаться снова",
      footer: "Спасибо за использование AURELLE!",
    },
    uz: {
      subject: "Yozilish bekor qilindi - AURELLE",
      greeting: "Assalomu alaykum",
      title: "Yozilishingiz bekor qilindi",
      details: "Bekor qilingan yozilish",
      salon: "Salon",
      service: "Xizmat",
      date: "Sana",
      time: "Vaqt",
      message: "Yozilishingiz muvaffaqiyatli bekor qilindi. Tez orada yana ko'rishga umid qilamiz!",
      bookAgain: "Qayta yozilish",
      footer: "AURELLE dan foydalanganingiz uchun rahmat!",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 30px; }
        .greeting { color: #333; font-size: 18px; margin-bottom: 20px; }
        .title { color: #f5576c; font-size: 24px; font-weight: 600; margin-bottom: 20px; }
        .details { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #6c757d; font-weight: 500; }
        .detail-value { color: #212529; font-weight: 600; }
        .message { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        .footer-logo { color: #667eea; font-weight: 600; font-size: 18px; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AURELLE</h1>
        </div>
        <div class="content">
          <div class="greeting">${t.greeting}, ${data.clientName}!</div>
          <div class="title">❌ ${t.title}</div>

          <div class="details">
            <h3 style="margin-top: 0; color: #f5576c;">${t.details}</h3>
            <div class="detail-row">
              <span class="detail-label">${t.salon}:</span>
              <span class="detail-value">${data.salonName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.service}:</span>
              <span class="detail-value">${data.serviceName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.date}:</span>
              <span class="detail-value">${data.date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.time}:</span>
              <span class="detail-value">${data.time}</span>
            </div>
          </div>

          <div class="message">
            ℹ️ ${t.message}
          </div>

          <div style="text-align: center;">
            <a href="${APP_URL}" class="button">${t.bookAgain}</a>
          </div>
        </div>
        <div class="footer">
          <div class="footer-logo">AURELLE</div>
          <div>${t.footer}</div>
          <div style="margin-top: 10px;">
            <a href="${APP_URL}" style="color: #667eea; text-decoration: none;">aurelle.uz</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, t.subject, html);
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
  language: string = "en",
): Promise<boolean> {
  const translations = {
    en: {
      subject: "Booking Reminder - AURELLE",
      greeting: "Hello",
      title: "Reminder: Your appointment is coming up!",
      timeUntil: "in",
      hours: "hours",
      details: "Appointment Details",
      salon: "Salon",
      service: "Service",
      master: "Master",
      date: "Date",
      time: "Time",
      anyMaster: "Any available master",
      reminder: "Don't forget your appointment! Please arrive 5 minutes early.",
      viewBooking: "View Booking",
      needCancel: "Need to cancel?",
      footer: "See you soon!",
    },
    ru: {
      subject: "Напоминание о записи - AURELLE",
      greeting: "Здравствуйте",
      title: "Напоминание: Скоро ваш визит!",
      timeUntil: "через",
      hours: "часов",
      details: "Детали записи",
      salon: "Салон",
      service: "Услуга",
      master: "Мастер",
      date: "Дата",
      time: "Время",
      anyMaster: "Любой свободный мастер",
      reminder: "Не забудьте о своей записи! Пожалуйста, приходите за 5 минут до начала.",
      viewBooking: "Посмотреть запись",
      needCancel: "Нужно отменить?",
      footer: "До встречи!",
    },
    uz: {
      subject: "Yozilish eslatmasi - AURELLE",
      greeting: "Assalomu alaykum",
      title: "Eslatma: Tez orada uchrashuvingiz!",
      timeUntil: "dan keyin",
      hours: "soat",
      details: "Yozilish tafsilotlari",
      salon: "Salon",
      service: "Xizmat",
      master: "Usta",
      date: "Sana",
      time: "Vaqt",
      anyMaster: "Har qanday bo'sh usta",
      reminder: "Yozilishingizni unutmang! Iltimos, 5 daqiqa oldin keling.",
      viewBooking: "Yozilishni ko'rish",
      needCancel: "Bekor qilish kerakmi?",
      footer: "Ko'rishguncha!",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 30px; }
        .greeting { color: #333; font-size: 18px; margin-bottom: 20px; }
        .title { color: #fa709a; font-size: 24px; font-weight: 600; margin-bottom: 10px; }
        .time-until { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 15px; border-radius: 6px; text-align: center; font-size: 20px; font-weight: 600; margin: 20px 0; }
        .details { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #6c757d; font-weight: 500; }
        .detail-value { color: #212529; font-weight: 600; }
        .reminder { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; color: #155724; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: 600; }
        .button-secondary { background: #6c757d; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        .footer-logo { color: #667eea; font-weight: 600; font-size: 18px; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AURELLE</h1>
        </div>
        <div class="content">
          <div class="greeting">${t.greeting}, ${data.clientName}!</div>
          <div class="title">⏰ ${t.title}</div>

          <div class="time-until">
            ${t.timeUntil} ${data.hoursUntil} ${t.hours}
          </div>

          <div class="details">
            <h3 style="margin-top: 0; color: #fa709a;">${t.details}</h3>
            <div class="detail-row">
              <span class="detail-label">${t.salon}:</span>
              <span class="detail-value">${data.salonName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.service}:</span>
              <span class="detail-value">${data.serviceName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.master}:</span>
              <span class="detail-value">${data.masterName || t.anyMaster}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.date}:</span>
              <span class="detail-value">${data.date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${t.time}:</span>
              <span class="detail-value">${data.time}</span>
            </div>
          </div>

          <div class="reminder">
            ℹ️ ${t.reminder}
          </div>

          <div style="text-align: center;">
            <a href="${APP_URL}/profile" class="button">${t.viewBooking}</a>
            <a href="${APP_URL}/profile" class="button button-secondary">${t.needCancel}</a>
          </div>
        </div>
        <div class="footer">
          <div class="footer-logo">AURELLE</div>
          <div>${t.footer}</div>
          <div style="margin-top: 10px;">
            <a href="${APP_URL}" style="color: #667eea; text-decoration: none;">aurelle.uz</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, t.subject, html);
}

// Password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  language = "ru",
): Promise<boolean> {
  const subjects: Record<string, string> = {
    ru: "Сброс пароля - AURELLE",
    uz: "Parolni tiklash - AURELLE",
    en: "Password Reset - AURELLE",
  };
  const subject = subjects[language] ?? subjects.ru;

  const body =
    language === "uz"
      ? `<h2>Parolni tiklash</h2>
         <p>AURELLE hisobingiz parolini tiklash so'rovi qabul qilindi.</p>
         <div style="text-align:center;margin:24px 0;">
           <a href="${resetLink}" style="display:inline-block;background:#667eea;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;">Parolni tiklash</a>
         </div>
         <p style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px;color:#555;font-size:14px;">Havola 1 soat davomida amal qiladi. Agar siz so'rov yubormasangiz, bu xatni e'tiborsiz qoldiring.</p>`
      : language === "en"
        ? `<h2>Password Reset</h2>
           <p>We received a request to reset your AURELLE account password.</p>
           <div style="text-align:center;margin:24px 0;">
             <a href="${resetLink}" style="display:inline-block;background:#667eea;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a>
           </div>
           <p style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px;color:#555;font-size:14px;">This link is valid for 1 hour. If you didn't request a password reset, please ignore this email.</p>`
        : `<h2>Сброс пароля</h2>
           <p>Мы получили запрос на сброс пароля вашего аккаунта AURELLE.</p>
           <div style="text-align:center;margin:24px 0;">
             <a href="${resetLink}" style="display:inline-block;background:#667eea;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;">Сбросить пароль</a>
           </div>
           <p style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px;color:#555;font-size:14px;">Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — проигнорируйте это письмо.</p>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#f5f5f5;}.container{max-width:600px;margin:40px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;}.content{padding:30px;color:#333;}.footer{text-align:center;padding:20px;color:#6c757d;font-size:13px;}</style>
</head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin:0;font-size:28px;font-weight:300;">AURELLE</h1></div>
    <div class="content">${body}</div>
    <div class="footer"><a href="${APP_URL}" style="color:#667eea;text-decoration:none;">aurelle.uz</a></div>
  </div>
</body>
</html>`;

  return sendEmail(email, subject, html);
}
