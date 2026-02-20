import { useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number; // milliseconds
  decimals?: number;
  separator?: string;
  suffix?: string;
  prefix?: string;
  enableScrollSpy?: boolean; // Only animate when visible
}

export function useCountUp({
  start = 0,
  end,
  duration = 2000,
  decimals = 0,
  separator = ",",
  suffix = "",
  prefix = "",
  enableScrollSpy = true,
}: UseCountUpOptions) {
  const [count, setCount] = useState(start);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enableScrollSpy) {
      // Animate immediately if scroll spy is disabled
      animateCount();
      return;
    }

    // Use Intersection Observer to detect when element is visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            animateCount();
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.3 } // Trigger when 30% visible
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated, enableScrollSpy]);

  const animateCount = () => {
    const startTime = Date.now();
    const range = end - start;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const currentCount = start + range * easeProgress;
      setCount(currentCount);

      if (progress >= 1) {
        clearInterval(timer);
        setCount(end);
      }
    }, 16); // ~60fps

    return () => clearInterval(timer);
  };

  const formattedValue = () => {
    const num = count.toFixed(decimals);
    const parts = num.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return prefix + parts.join(".") + suffix;
  };

  return {
    value: formattedValue(),
    elementRef,
  };
}
