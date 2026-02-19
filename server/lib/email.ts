import nodemailer from "nodemailer";
import { logger } from "./logger";

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || "AURELLE <noreply@aurelle.uz>";

// Create transporter
const createTransporter = () => {
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    logger.warn("Email credentials not configured. Emails will not be sent.", { source: "email-service" });
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });
};

let transporter = createTransporter();

/**
 * Send email
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  if (!transporter) {
    logger.warn("Email transporter not configured. Skipping email.", { source: "email-service", to, subject });
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });

    logger.info("Email sent successfully", { source: "email-service", to, subject, messageId: info.messageId });
    return true;
  } catch (error) {
    logger.error("Failed to send email", error as Error, { source: "email-service", to, subject });
    return false;
  }
}

/**
 * Send user blocked notification
 */
export async function sendUserBlockedEmail(
  userEmail: string,
  userName: string,
  reason: string,
  adminName: string
): Promise<boolean> {
  const subject = "Your AURELLE Account Has Been Temporarily Suspended";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Account Suspended</h1>
    </div>
    <div class="content">
      <p>Dear ${userName},</p>

      <p>We regret to inform you that your AURELLE account has been temporarily suspended by our administration team.</p>

      <div class="reason-box">
        <strong>Reason for suspension:</strong><br>
        ${reason}
      </div>

      <p><strong>What this means:</strong></p>
      <ul>
        <li>You cannot log in to your account</li>
        <li>Your profile is not visible to other users</li>
        <li>You cannot make or receive bookings</li>
        <li>Your salon/service listings are temporarily hidden</li>
      </ul>

      <p><strong>What you can do:</strong></p>
      <ol>
        <li>Review our <a href="https://aurelle.uz/terms">Terms of Service</a> and <a href="https://aurelle.uz/community-guidelines">Community Guidelines</a></li>
        <li>If you believe this is a mistake, contact our support team</li>
        <li>Address the issue mentioned in the suspension reason</li>
      </ol>

      <p>To appeal this decision or for more information, please contact our support team:</p>
      <a href="mailto:support@aurelle.uz" class="button">Contact Support</a>

      <p class="warning">Note: Repeated violations may result in permanent account termination.</p>

      <p>Suspended by: ${adminName}<br>
      Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <p>Best regards,<br>
      The AURELLE Team</p>
    </div>
    <div class="footer">
      <p>AURELLE Beauty Marketplace Platform<br>
      This is an automated message. Please do not reply to this email.</p>
      <p><a href="https://aurelle.uz">Visit Website</a> | <a href="mailto:support@aurelle.uz">Support</a> | <a href="https://aurelle.uz/privacy">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>
  `;

  return await sendEmail(userEmail, subject, html);
}

/**
 * Send user unblocked notification
 */
export async function sendUserUnblockedEmail(
  userEmail: string,
  userName: string,
  adminName: string
): Promise<boolean> {
  const subject = "Your AURELLE Account Has Been Reinstated";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Account Reinstated</h1>
    </div>
    <div class="content">
      <p>Dear ${userName},</p>

      <div class="success-box">
        <strong>Good news!</strong> Your AURELLE account suspension has been lifted and your account has been fully reinstated.
      </div>

      <p>You now have full access to your account and can:</p>
      <ul>
        <li>✓ Log in to your account</li>
        <li>✓ Access your profile and settings</li>
        <li>✓ Make and receive bookings</li>
        <li>✓ Manage your salon/service listings</li>
        <li>✓ Interact with other users</li>
      </ul>

      <p><strong>Moving forward:</strong></p>
      <p>Please ensure you follow our <a href="https://aurelle.uz/terms">Terms of Service</a> and <a href="https://aurelle.uz/community-guidelines">Community Guidelines</a> to maintain your account in good standing.</p>

      <a href="https://aurelle.uz/login" class="button">Log In to AURELLE</a>

      <p>If you have any questions or need assistance, our support team is here to help.</p>

      <p>Reinstated by: ${adminName}<br>
      Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <p>Thank you for being part of the AURELLE community!</p>

      <p>Best regards,<br>
      The AURELLE Team</p>
    </div>
    <div class="footer">
      <p>AURELLE Beauty Marketplace Platform<br>
      This is an automated message. Please do not reply to this email.</p>
      <p><a href="https://aurelle.uz">Visit Website</a> | <a href="mailto:support@aurelle.uz">Support</a> | <a href="https://aurelle.uz/privacy">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>
  `;

  return await sendEmail(userEmail, subject, html);
}

/**
 * Strip HTML tags for plain text version
 */
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

/**
 * Verify email configuration (for debugging)
 */
export async function verifyEmailConfig(): Promise<boolean> {
  if (!transporter) {
    logger.error("Email transporter not configured", new Error("Missing EMAIL_USER or EMAIL_PASSWORD"), { source: "email-service" });
    return false;
  }

  try {
    await transporter.verify();
    logger.info("Email configuration verified successfully", { source: "email-service" });
    return true;
  } catch (error) {
    logger.error("Email configuration verification failed", error as Error, { source: "email-service" });
    return false;
  }
}
