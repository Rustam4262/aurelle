import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import type { Express } from "express";
import { authStorage } from "./auth/storage";

function getGitHubCredentials() {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    return null;
  }

  if (clientID.length < 10 || clientSecret.length < 10) {
    console.warn("GitHub OAuth credentials appear to be invalid");
    return null;
  }

  return { clientID, clientSecret };
}

export async function setupGitHubAuth(app: Express) {
  const credentials = getGitHubCredentials();

  if (!credentials) {
    console.log("GitHub OAuth not configured - missing or invalid GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET");
    return;
  }

  const registeredStrategies = new Set<string>();

  const ensureGitHubStrategy = (req: any) => {
    const hostname = req.hostname;
    const strategyName = `github:${hostname}`;
    if (!registeredStrategies.has(strategyName)) {
      const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'https';
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
          done: (error: any, user?: any) => void
        ) => {
          try {
            const email = profile.emails?.[0]?.value || null;
            const displayName = profile.displayName || profile.username || null;
            const nameParts = displayName?.split(" ") || [];
            const firstName = nameParts[0] || null;
            const lastName = nameParts.slice(1).join(" ") || null;
            const profileImageUrl = profile.photos?.[0]?.value || undefined;

            await authStorage.upsertUser({
              id: `github:${profile.id}`,
              email,
              firstName,
              lastName,
              profileImageUrl,
            });

            const user = {
              claims: {
                sub: `github:${profile.id}`,
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
        }
      );

      passport.use(strategyName, strategy);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/auth/github", (req, res, next) => {
    ensureGitHubStrategy(req);
    passport.authenticate(`github:${req.hostname}`, {
      scope: ['user:email']
    })(req, res, next);
  });

  app.get("/api/auth/github/callback", (req, res, next) => {
    ensureGitHubStrategy(req);
    passport.authenticate(`github:${req.hostname}`, {
      successRedirect: "/auth",
      failureRedirect: "/auth?error=github_auth_failed",
    })(req, res, next);
  });

  console.log("GitHub OAuth configured successfully");
}

export function isGitHubConfigured(): boolean {
  return getGitHubCredentials() !== null;
}
