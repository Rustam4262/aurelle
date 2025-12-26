import { Router } from "express";
import { isYandexConfigured } from "../yandexAuth";
import { isGoogleConfigured } from "../googleAuth";
import { isGitHubConfigured } from "../githubAuth";
import { isPhoneAuthConfigured } from "../phoneAuth";

const router = Router();

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
