import passport from "passport";
import { Strategy as YandexStrategy } from "passport-yandex";
import type { Express } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authStorage } from "./auth/storage";
import { logger } from "./lib/logger";
import { oauthLimiter } from "./middleware/rateLimiter";
import { captureException } from "./lib/sentry";
import { trackUserLogin } from "./middleware/activity";
import { isSoftDeletedUser } from "./lib/user-deletion";

function getYandexCredentials(): { clientID: string; clientSecret: string } | null {
  const clientID = process.env.YANDEX_CLIENT_ID?.trim();
  const clientSecret = process.env.YANDEX_CLIENT_SECRET?.trim();

  if (!clientID || !clientSecret) {
    return null;
  }

  if (clientID.length < 10 || clientSecret.length < 10) {
    return null;
  }

  return { clientID, clientSecret };
}

function isAllowedRedirect(path?: string): boolean {
  if (!path) return false;
  // Same-origin only: must start with / but not // (protocol-relative), no ://
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !/[\\\x00-\x20]/.test(path) &&
    !path.includes("://")
  );
}

export async function setupYandexAuth(app: Express) {
  const credentials = getYandexCredentials();

  if (!credentials) {
    const clientID = process.env.YANDEX_CLIENT_ID;
    const clientSecret = process.env.YANDEX_CLIENT_SECRET;

    if (!clientID || clientID.trim() === "") {
      logger.warn("[OAuth] Yandex not configured — YANDEX_CLIENT_ID is missing or empty in .env");
    } else if (clientID.length < 10) {
      logger.warn(
        "[OAuth] Yandex not configured — YANDEX_CLIENT_ID looks like a placeholder (too short)",
      );
    } else if (!clientSecret || clientSecret.trim() === "") {
      logger.warn(
        "[OAuth] Yandex not configured — YANDEX_CLIENT_SECRET is missing or empty in .env",
      );
    } else {
      logger.warn(
        "[OAuth] Yandex not configured — YANDEX_CLIENT_SECRET looks like a placeholder (too short)",
      );
    }

    // Fallback routes so unconfigured provider returns a clear error instead of 404
    app.get("/api/auth/yandex", (_req, res) => {
      res.redirect("/auth?error=provider_not_configured");
    });
    app.get("/api/auth/yandex/callback", (_req, res) => {
      res.redirect("/auth?error=provider_not_configured");
    });
    return;
  }

  const registeredStrategies = new Set<string>();
  // Fixed production callback; do not derive it from untrusted Host/proxy headers.
  const callbackURL =
    process.env.YANDEX_CALLBACK_URL?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "https://aurelle.uz/api/auth/yandex/callback"
      : "http://localhost:5000/api/auth/yandex/callback");

  const ensureYandexStrategy = (req: any) => {
    const hostname = "aurelle";
    const strategyName = `yandex:${hostname}`;
    if (!registeredStrategies.has(strategyName)) {
      // The strategy forwards these options to passport-oauth2; bundled types omit state.
      const options = {
        clientID: credentials.clientID,
        clientSecret: credentials.clientSecret,
        callbackURL,
        state: true,
      };
      const strategy = new YandexStrategy(
        options,
        async (
          accessToken: string,
          refreshToken: string,
          profile: any,
          done: (error: any, user?: any) => void,
        ) => {
          try {
            const email =
              (profile._json?.default_email || profile.emails?.[0]?.value)?.trim().toLowerCase() ||
              null;
            if (!profile.id) {
              return done(new Error("YANDEX_ID_MISSING"));
            }
            const firstName =
              profile._json?.first_name || profile.name?.givenName || profile.displayName || null;
            const lastName = profile._json?.last_name || profile.name?.familyName || null;
            const profileImageUrl = profile._json?.is_avatar_empty
              ? undefined
              : profile.photos?.[0]?.value;

            const { userId, isNew } = await authStorage.upsertUser({
              id: `yandex:${profile.id}`,
              email,
              firstName,
              lastName,
              profileImageUrl,
              oauthProvider: "yandex",
              // Yandex profile does not provide email_verified; do not merge by email alone.
              allowEmailLink: false,
            });

            const [account] = await db
              .select({
                required: users.roleSelectionRequired,
                authVersion: users.authVersion,
                isBlocked: users.isBlocked,
                blockReason: users.blockReason,
              })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);

            if (account?.isBlocked || isSoftDeletedUser(account ?? {})) {
              return done(new Error("ACCOUNT_BLOCKED"));
            }

            const user = {
              authVersion: account?.authVersion ?? 0,
              onboardingPath: account?.required || isNew ? "/choose-role" : undefined,
              claims: {
                sub: userId,
                email,
                first_name: firstName,
                last_name: lastName,
                profile_image_url: profileImageUrl,
              },
              expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
            };

            done(null, user);
          } catch (error) {
            captureException(error as Error, { source: "yandex-oauth" });
            done(error);
          }
        },
      );

      passport.use(strategyName, strategy);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/auth/yandex", oauthLimiter, (req, res, next) => {
    ensureYandexStrategy(req);

    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const redirect = typeof req.query.redirect === "string" ? req.query.redirect : undefined;

    delete (req.session as any).oauthRole;
    delete (req.session as any).oauthRedirect;
    if (role && ["client", "owner", "solo_master"].includes(role)) {
      (req.session as any).oauthRole = role;
    }
    if (isAllowedRedirect(redirect)) {
      (req.session as any).oauthRedirect = redirect;
    }

    passport.authenticate("yandex:aurelle", {
      scope: ["login:info", "login:email", "login:avatar"],
    })(req, res, next);
  });

  app.get("/api/auth/yandex/callback", (req, res, next) => {
    ensureYandexStrategy(req);
    passport.authenticate("yandex:aurelle", (err: any, user: any) => {
      if (err || !user) {
        logger.warn(`[OAuth] Yandex callback failed: ${err?.message ?? "no user returned"}`, {
          source: "yandex-oauth",
          meta: { error: String(err ?? "no user") },
        });
        return res.redirect(
          err?.message === "EMAIL_LINK_REQUIRES_LOGIN"
            ? "/auth?error=email_link_requires_login"
            : "/auth?error=yandex_auth_failed",
        );
      }

      const role = (req.session as any).oauthRole as string | undefined;
      const redirect = (req.session as any).oauthRedirect as string | undefined;
      delete (req.session as any).oauthRole;
      delete (req.session as any).oauthRedirect;

      // Rotate the session identifier after successful authentication.
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return res.redirect("/auth?error=yandex_auth_failed");
        (req.session as any).passport = { user };

        req.session.save((saveErr) => {
          if (saveErr) {
            logger.warn(`[OAuth] Yandex session save failed: ${saveErr.message}`, {
              source: "yandex-oauth",
            });
            return res.redirect("/auth?error=yandex_auth_failed");
          }

          // Track login activity
          const userId = user?.claims?.sub;
          if (userId) trackUserLogin(userId, req);

          const dest =
            user.onboardingPath ||
            (isAllowedRedirect(redirect)
              ? redirect!
              : role
                ? `/auth?role=${encodeURIComponent(role)}`
                : "/auth");

          logger.info(`[OAuth] Yandex login OK — sub=${userId ?? "unknown"} → ${dest}`, {
            source: "yandex-oauth",
          });
          res.redirect(dest);
        });
      });
    })(req, res, next);
  });

  logger.info("[OAuth] Yandex configured successfully");
}

export function isYandexConfigured(): boolean {
  return getYandexCredentials() !== null;
}
