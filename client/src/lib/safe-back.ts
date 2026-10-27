type NavigateFn = (to: string) => void;

export function goBackOrNavigate(navigate: NavigateFn, fallback: string) {
  if (typeof window === "undefined") {
    navigate(fallback);
    return;
  }

  // In our SPA flow, document.referrer often stays stale even when the user
  // actually navigated inside the app. Mirror the browser back button first.
  if (Number(window.history.state?.aurelleDepth || 0) > 0) {
    window.history.back();
    return;
  }

  navigate(fallback);
}
