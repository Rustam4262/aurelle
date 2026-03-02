import passport from "passport";
import { Strategy as YandexStrategy } from "passport-yandex";
import type { Express } from "express";
import { authStorage } from "./auth/storage";
import { logger } from "./lib/logger";
import { oauthLimiter } from "./middleware/rateLimiter";
import { captureException } from "./lib/sentry";
import { trackUserLogin } from "./middleware/activity";

function getYandexCredentials(): { clientID: string; clientSecret: string } | null {
  const clientID = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;

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
  return /^\/[^/]/.test(path) && !path.includes("://");
}

export async function setupYandexAuth(app: Express) {
  const credentials = getYandexCredentials();

  if (!credentials) {
    const clientID = process.env.YANDEX_CLIENT_ID;
    const clientSecret = process.env.YANDEX_CLIENT_SECRET;

    if (!clientID || clientID.trim() === "") {
      logger.warn("[OAuth] Yandex not configured — YANDEX_CLIENT_ID is missing or empty in .env");
    } else if (clientID.length < 10) {
      logger.warn("[OAuth] Yandex not configured — YANDEX_CLIENT_ID looks like a placeholder (too short)");
    } else if (!clientSecret || clientSecret.trim() === "") {
      logger.warn("[OAuth] Yandex not configured — YANDEX_CLIENT_SECRET is missing or empty in .env");
    } else {
      logger.warn("[OAuth] Yandex not configured — YANDEX_CLIENT_SECRET looks like a placeholder (too short)");
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

  const ensureYandexStrategy = (req: any) => {
    const hostname = req.hostname;
    const strategyName = `yandex:${hostname}`;
    if (!registeredStrategies.has(strategyName)) {
      const protocol = req.get("X-Forwarded-Proto") || req.protocol || "https";
      const callbackURL = `${protocol}://${hostname}/api/auth/yandex/callback`;

      const strategy = new YandexStrategy(
        {
          clientID: credentials.clientID,
          clientSecret: credentials.clientSecret,
          callbackURL,
        },
        async (
          accessToken: string,
          refreshToken: string,
          profile: any,
          done: (error: any, user?: any) => void,
        ) => {
          try {
            const email = profile.emails?.[0]?.value || profile._json?.default_email || null;
            const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || null;
            const lastName =
              profile.name?.familyName ||
              profile.displayName?.split(" ").slice(1).join(" ") ||
              null;
            const profileImageUrl = profile._json?.default_avatar_id
              ? `https://avatars.yandex.net/get-yapic/${profile._json.default_avatar_id}/islands-200`
              : undefined;

            const { userId } = await authStorage.upsertUser({
              id: `yandex:${profile.id}`,
              email,
              firstName,
              lastName,
              profileImageUrl,
            });

            const user = {
              claims: {
                sub: userId,
                email,
                first_name: firstName,
                last_name: lastName,
                profile_image_url: profileImageUrl,
              },
              access_token: accessToken,
              refresh_token: refreshToken,
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

    if (role && ["client", "owner", "solo_master"].includes(role)) {
      (req.session as any).oauthRole = role;
    }
    if (isAllowedRedirect(redirect)) {
      (req.session as any).oauthRedirect = redirect;
    }

    passport.authenticate(`yandex:${req.hostname}`)(req, res, next);
  });

  app.get("/api/auth/yandex/callback", (req, res, next) => {
    ensureYandexStrategy(req);
    passport.authenticate(`yandex:${req.hostname}`, (err: any, user: any) => {
      if (err || !user) {
        logger.warn(`[OAuth] Yandex callback failed: ${err?.message ?? "no user returned"}`, {
          source: "yandex-oauth",
          meta: { error: String(err ?? "no user") },
        });
        return res.redirect("/auth?error=yandex_auth_failed");
      }

      const role = (req.session as any).oauthRole as string | undefined;
      const redirect = (req.session as any).oauthRedirect as string | undefined;
      delete (req.session as any).oauthRole;
      delete (req.session as any).oauthRedirect;

      // Persist session the same way localAuth does — passport.initialize() is not used
      // in this app, so req.logIn() is not available. Write directly to session.
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

        const dest = isAllowedRedirect(redirect)
          ? redirect!
          : role
            ? `/auth?role=${encodeURIComponent(role)}`
            : "/auth";

        logger.info(`[OAuth] Yandex login OK — sub=${userId ?? "unknown"} → ${dest}`, {
          source: "yandex-oauth",
        });
        res.redirect(dest);
      });
    })(req, res, next);
  });

  logger.info("[OAuth] Yandex configured successfully");
}

export function isYandexConfigured(): boolean {
  return getYandexCredentials() !== null;
}
