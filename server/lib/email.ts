/**
 * @deprecated Shim for backward compatibility.
 * All email logic has moved to server/email/index.ts.
 * Import directly from "../email" in new code.
 */

export {
  sendEmail,
  sendUserBlockedEmail,
  sendUserUnblockedEmail,
  verifyTransport as verifyEmailConfig,
} from "../email";
