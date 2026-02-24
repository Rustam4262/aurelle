import { useEffect, useCallback, useRef } from "react";

/**
 * Preload critical resources for better performance.
 * Adds link hints to <head> — safe because React doesn't manage <head>.
 */
export function PreloadHints() {
  useEffect(() => {
    const links: HTMLLinkElement[] = [];

    // Preload critical fonts
    const fonts = [
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap",
    ];

    fonts.forEach((href) => {
      // Avoid duplicates
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "style";
      link.href = href;
      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      links.forEach((link) => {
        if (link.parentNode === document.head) {
          document.head.removeChild(link);
        }
      });
    };
  }, []);

  return null;
}

/**
 * Prefetch a route's code when user hovers over a link.
 */
interface PrefetchLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function PrefetchLink({ href, children, className }: PrefetchLinkProps) {
  const prefetched = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (prefetched.current) return;
    if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    document.head.appendChild(link);
    prefetched.current = true;
  }, [href]);

  return (
    <a
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
    >
      {children}
    </a>
  );
}
