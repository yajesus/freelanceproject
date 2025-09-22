import { useEffect } from "react";

export function useSetDropYvh() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isIphone =
      /iPhone|iPad|iPod/i.test(navigator.userAgent) && !("MSStream" in window);
    const updateDropY = () => {
      const vh = window.innerHeight / 100;
      const offset = isIphone ? -32.5 * vh : -31.8 * vh;
      document.documentElement.style.setProperty("--drop-y-vh", `${offset}px`);
    };

    updateDropY();
    window.addEventListener("resize", updateDropY);
    return () => window.removeEventListener("resize", updateDropY);
  }, []);
}
