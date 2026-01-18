import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Extract token from URL query string
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");

    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError(t("auth.invalidResetLink", "Invalid or missing reset token"));
    }
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch", "Passwords do not match"));
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      setError(t("auth.passwordTooShort", "Password must be at least 8 characters"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/confirm-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation("/auth");
        }, 3000);
      } else {
        setError(data.message || t("auth.passwordResetFailed", "Failed to reset password"));
      }
    } catch (err) {
      setError(t("auth.networkError", "Network error. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>{t("auth.passwordResetSuccess", "Password Reset Successful")}</CardTitle>
            <CardDescription>
              {t(
                "auth.passwordResetSuccessDescription",
                "Your password has been successfully reset. You can now log in with your new password."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            {t("auth.redirectingToLogin", "Redirecting to login page...")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>{t("auth.invalidResetLink", "Invalid Reset Link")}</CardTitle>
            <CardDescription>
              {t(
                "auth.invalidResetLinkDescription",
                "This password reset link is invalid or has expired. Please request a new one."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/auth/forgot-password")} className="w-full">
              {t("auth.requestNewLink", "Request New Link")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.resetPassword", "Reset Password")}</CardTitle>
          <CardDescription>
            {t("auth.resetPasswordDescription", "Enter your new password below.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                {t("auth.newPassword", "New Password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder={t("auth.passwordPlaceholder", "Enter your password")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                  minLength={8}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("auth.passwordRequirement", "Minimum 8 characters")}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {t("auth.confirmPassword", "Confirm Password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("auth.confirmPasswordPlaceholder", "Confirm your password")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                  minLength={8}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? t("auth.resetting", "Resetting...")
                : t("auth.resetPassword", "Reset Password")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
