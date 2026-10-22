/**
 * Session cookie name. express-session defaults to "connect.sid", which
 * fingerprints the app as running Express to any casual observer. Every
 * place that sets or clears the session cookie must use this same constant.
 *
 * Changing this value logs out every currently-active session on deploy —
 * browsers hold the old cookie name, which the server stops recognizing.
 */
export const SESSION_COOKIE_NAME = "aurelle.sid";
