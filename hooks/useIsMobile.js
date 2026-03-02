import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 768) {
  // SSR安全: 初期値はwindowが存在する場合のみ判定（ハイドレーション不一致を防止）
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
    }
    return false;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}
