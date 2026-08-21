"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegistration() {
  const [isOffline, setIsOffline] = useState(false);
  const [showIOSWarning, setShowIOSWarning] = useState(false);

  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;

  useEffect(() => {
    if (isIOS && !localStorage.getItem("ios-warning-shown")) {
      setShowIOSWarning(true);
      localStorage.setItem("ios-warning-shown", "1");
    }
  }, [isIOS]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }

      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("[SW] Registration failed:", err));
    }

    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return (
    <>
      {showIOSWarning && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white text-xs rounded-lg shadow-xl px-4 py-3 max-w-[90vw]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium mb-1">⚠️ iOS giới hạn lưu trữ</p>
              <p className="text-amber-100 leading-relaxed">
                iOS Safari có thể không lưu được tất cả 24 truyện (~115MB). Hãy "Add to Home Screen" để tăng giới hạn. Truyện nào đã mở sẽ vẫn đọc offline được.
              </p>
            </div>
            <button
              onClick={() => setShowIOSWarning(false)}
              className="text-amber-200 hover:text-white shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {isOffline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
          Đang offline
        </div>
      )}
    </>
  );
}
