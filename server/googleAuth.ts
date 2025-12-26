import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { authStorage } from "./auth/storage";

function getGoogleCredentials() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    return null;
  }

  if (clientID.length < 10 || clientSecret.length < 10) {
    console.warn("Google OAuth credentials appear to be invalid");
    return null;
  }

  return { clientID, clientSecret };
}

export async function setupGoogleAuth(app: Express) {
  const credentials = getGoogleCredentials();

  if (!credentials) {
    console.log("Google OAuth not configured - missing or invalid GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
    return;
  }

  const registeredStrategies = new Set<string>();

  const ensureGoogleStrategy = (req: any) => {
    const hostname = req.hostname;
    const strategyName = `google:${hostname}`;
    if (!registeredStrategies.has(strategyName)) {
      const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'https';
      const callbackURL = `${protocol}://${hostname}/api/auth/google/callback`;

      const strategy = new GoogleStrategy(
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
            const firstName = profile.name?.givenName || null;
            const lastName = profile.name?.familyName || null;
            const profileImageUrl = profile.photos?.[0]?.value || undefined;

            await authStorage.upsertUser({
              id: `google:${profile.id}`,
              email,
              firstName,
              lastName,
              profileImageUrl,
            });

            const user = {
              claims: {
                sub: `google:${profile.id}`,
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

  app.get("/api/auth/google", (req, res, next) => {
    ensureGoogleStrategy(req);
    passport.authenticate(`google:${req.hostname}`, {
      scope: ['profile', 'email']
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    ensureGoogleStrategy(req);
    passport.authenticate(`google:${req.hostname}`, {
      successRedirect: "/auth",
      failureRedirect: "/auth?error=google_auth_failed",
    })(req, res, next);
  });

  console.log("Google OAuth configured successfully");
}

export function isGoogleConfigured(): boolean {
  return getGoogleCredentials() !== null;
}
