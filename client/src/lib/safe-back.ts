type NavigateFn = (to: string) => void;

export function goBackOrNavigate(navigate: NavigateFn, fallback: string) {
  if (typeof window === "undefined") {
    navigate(fallback);
    return;
  }

  // In our SPA flow, document.referrer often stays stale even when the user
  // actually navigated inside the app. Mirror the browser back button first.
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  navigate(fallback);
}
