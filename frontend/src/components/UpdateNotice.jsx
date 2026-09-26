import { useEffect, useState } from "react";

export default function UpdateNotice() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const current = document.querySelector('script[type="module"][src]')?.getAttribute("src");
    if (import.meta.env.DEV || !current) return;
    let stopped = false;
    let checking = false;
    const controller = new AbortController();
    const check = async () => {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      try {
        const response = await fetch("/index.html", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const html = new DOMParser().parseFromString(await response.text(), "text/html");
        const latest = html.querySelector('script[type="module"][src]')?.getAttribute("src");
        if (!stopped && latest && latest !== current) setAvailable(true);
      } catch { /* Offline learning continues unchanged. */ }
      finally { checking = false; }
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    const interval = setInterval(check, 60000);
    return () => {
      stopped = true; controller.abort(); clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, []);
  return available ? <button className="update-notice" onClick={() => window.location.reload()}>
    새 버전이 있어요 · 눌러서 업데이트
  </button> : null;
}
