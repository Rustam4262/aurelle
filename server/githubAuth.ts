import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import type { Express } from "express";
import { authStorage } from "./auth/storage";
import { logger } from "./lib/logger";
import { trackUserLogin } from "./middleware/activity";
import { isSoftDeletedUser } from "./lib/user-deletion";

function getGitHubCredentials() {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    return null;
  }

  if (clientID.length < 10 || clientSecret.length < 10) {
    logger.warn("GitHub OAuth credentials appear to be invalid");
    return null;
  }

  return { clientID, clientSecret };
}

export async function setupGitHubAuth(app: Express) {
  const credentials = getGitHubCredentials();

  if (!credentials) {
    logger.info(
      "GitHub OAuth not configured - missing or invalid GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET",
    );
    return;
  }

  const registeredStrategies = new Set<string>();

  const ensureGitHubStrategy = (req: any) => {
    const hostname = req.hostname;
    const strategyName = `github:${hostname}`;
    if (!registeredStrategies.has(strategyName)) {
      const protocol = req.get("X-Forwarded-Proto") || req.protocol || "https";
      const callbackURL = `${protocol}://${hostname}/api/auth/github/callback`;

      const strategy = new GitHubStrategy(
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
            const email = profile.emails?.[0]?.value?.trim().toLowerCase() || null;
            const displayName = profile.displayName || profile.username || null;
            const nameParts = displayName?.split(" ") || [];
            const firstName = nameParts[0] || null;
            const lastName = nameParts.slice(1).join(" ") || null;
            const profileImageUrl = profile.photos?.[0]?.value || undefined;

            const { userId } = await authStorage.upsertUser({
              id: `github:${profile.id}`,
              email,
              firstName,
              lastName,
              profileImageUrl,
            });

            const [account] = await db
              .select({
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
              claims: {
                sub: userId,
                email,
                first_name: firstName,
                last_name: lastName,
                profile_image_url: profileImageUrl,
              },
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            };

            done(null, user);
          } catch (error) {
            done(error);
          }
        },
      );

      passport.use(strategyName, strategy);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/auth/github", (req, res, next) => {
    ensureGitHubStrategy(req);
    passport.authenticate(`github:${req.hostname}`, {
      scope: ["user:email"],
    })(req, res, next);
  });

  app.get("/api/auth/github/callback", (req, res, next) => {
    ensureGitHubStrategy(req);
    // Custom-callback form: this app never mounts passport.initialize()/
    // passport.session() (it manages req.session.passport itself, the same
    // way localAuth.ts/googleAuth.ts/yandexAuth.ts do), so the options-based
    // form used here before — which relies on Passport calling req.login()
    // internally — would throw at runtime the first time anyone actually
    // completed a GitHub login.
    passport.authenticate(`github:${req.hostname}`, (err: any, user: any) => {
      if (err || !user) {
        logger.warn(`[OAuth] GitHub callback failed: ${err?.message ?? "no user returned"}`, {
          source: "github-oauth",
          meta: { error: String(err ?? "no user") },
        });
        return res.redirect("/auth?error=github_auth_failed");
      }

      // Rotate the session identifier after successful authentication.
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return res.redirect("/auth?error=github_auth_failed");
        (req.session as any).passport = { user };

        req.session.save((saveErr) => {
          if (saveErr) {
            logger.warn(`[OAuth] GitHub session save failed: ${saveErr.message}`, {
              source: "github-oauth",
            });
            return res.redirect("/auth?error=github_auth_failed");
          }

          const userId = user?.claims?.sub;
          if (userId) trackUserLogin(userId, req);

          logger.info(`[OAuth] GitHub login OK — sub=${userId ?? "unknown"}`, {
            source: "github-oauth",
          });
          res.redirect("/auth");
        });
      });
    })(req, res, next);
  });

  logger.info("GitHub OAuth configured successfully");
}

export function isGitHubConfigured(): boolean {
  return getGitHubCredentials() !== null;
}
