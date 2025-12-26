import passport from "passport";
import { Strategy as YandexStrategy } from "passport-yandex";
import type { Express } from "express";
import { authStorage } from "./auth/storage";

function getYandexCredentials() {
  const clientID = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  
  if (!clientID || !clientSecret) {
    return null;
  }
  
  if (clientID.length < 10 || clientSecret.length < 10) {
    console.warn("Yandex OAuth credentials appear to be invalid");
    return null;
  }
  
  return { clientID, clientSecret };
}

export async function setupYandexAuth(app: Express) {
  const credentials = getYandexCredentials();
  
  if (!credentials) {
    console.log("Yandex OAuth not configured - missing or invalid YANDEX_CLIENT_ID/YANDEX_CLIENT_SECRET");
    return;
  }

  const registeredStrategies = new Set<string>();

  const ensureYandexStrategy = (req: any) => {
    const hostname = req.hostname;
    const strategyName = `yandex:${hostname}`;
    if (!registeredStrategies.has(strategyName)) {
      const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'https';
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
          done: (error: any, user?: any) => void
        ) => {
          try {
            const email = profile.emails?.[0]?.value || profile._json?.default_email || null;
            const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || null;
            const lastName = profile.name?.familyName || profile.displayName?.split(" ").slice(1).join(" ") || null;
            const profileImageUrl = profile._json?.default_avatar_id
              ? `https://avatars.yandex.net/get-yapic/${profile._json.default_avatar_id}/islands-200`
              : undefined;

            await authStorage.upsertUser({
              id: `yandex:${profile.id}`,
              email,
              firstName,
              lastName,
              profileImageUrl,
            });

            const user = {
              claims: {
                sub: `yandex:${profile.id}`,
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

  app.get("/api/auth/yandex", (req, res, next) => {
    ensureYandexStrategy(req);
    passport.authenticate(`yandex:${req.hostname}`)(req, res, next);
  });

  app.get("/api/auth/yandex/callback", (req, res, next) => {
    ensureYandexStrategy(req);
    passport.authenticate(`yandex:${req.hostname}`, {
      successRedirect: "/auth",
      failureRedirect: "/auth?error=yandex_auth_failed",
    })(req, res, next);
  });
  
  console.log("Yandex OAuth configured successfully");
}

export function isYandexConfigured(): boolean {
  return getYandexCredentials() !== null;
}
