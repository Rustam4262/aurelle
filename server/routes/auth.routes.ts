import { Router } from "express";
import { isYandexConfigured } from "../yandexAuth";
import { isGoogleConfigured } from "../googleAuth";
import { isGitHubConfigured } from "../githubAuth";
import { isPhoneAuthConfigured } from "../phoneAuth";

const router = Router();

// Get current authenticated user
router.get("/auth/user", (req: any, res) => {
  // Check if user is authenticated via session
  if (req.session && req.session.passport?.user) {
    const user = req.session.passport.user;
    return res.json({
      id: user.claims.sub,
      email: user.claims.email,
      firstName: user.claims.first_name,
      lastName: user.claims.last_name,
      profileImageUrl: user.claims.profile_image_url,
    });
  }

  // User not authenticated
  return res.status(401).json({ message: "Not authenticated" });
});

// Logout endpoint
router.post("/logout", (req: any, res) => {
  if (req.session) {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true, message: "Logged out successfully" });
    });
  } else {
    return res.json({ success: true, message: "Already logged out" });
  }
});

// Auth providers status endpoint
router.get("/auth/providers", (_req, res) => {
  res.json({
    local: true,
    yandex: isYandexConfigured(),
    google: isGoogleConfigured(),
    github: isGitHubConfigured(),
    phone: isPhoneAuthConfigured(),
  });
});

export default router;
