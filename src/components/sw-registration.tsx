"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface PrecacheState {
  status: "idle" | "downloading" | "done" | "error" | "quota_exceeded";
  total: number;
  cached: number;
  failed: number;
  current: string;
}

export function ServiceWorkerRegistration() {
  const [isOffline, setIsOffline] = useState(false);
  const [precache, setPrecache] = useState<PrecacheState>({
    status: "idle",
    total: 0,
    cached: 0,
    failed: 0,
    current: "",
  });
  const [showPrecacheBar, setShowPrecacheBar] = useState(false);
  const [showIOSWarning, setShowIOSWarning] = useState(false);
  const dismissedRef = useRef(false);

  // Detect iOS
  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;

  useEffect(() => {
    // Show iOS storage warning on first visit
    if (isIOS && !sessionStorage.getItem("ios-warning-shown")) {
      setShowIOSWarning(true);
      sessionStorage.setItem("ios-warning-shown", "1");
    }
  }, [isIOS]);

  useEffect(() => {
    let messageHandler: ((event: MessageEvent) => void) | null = null;

    if ("serviceWorker" in navigator) {
      // Request persistent storage to prevent iOS/Android from evicting cache
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then((isPersisted) => {
          if (isPersisted) {
            console.log("[SW] Persistent storage granted");
          } else {
            console.warn("[SW] Persistent storage not granted - cache may be evicted");
          }
        }).catch(() => {});
      }

      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Registered:", registration.scope);

          // If SW is already active, check if precache was already done
          if (registration.active) {
            registration.active.postMessage({ type: "CHECK_PRECACHE_STATUS" });
          }
        })
        .catch((err) => {
          console.warn("[SW] Registration failed:", err);
        });

      // Listen for messages from SW
      messageHandler = (event: MessageEvent) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === "PRECACHE_START") {
          if (!dismissedRef.current) {
            setPrecache({ status: "downloading", total: data.total, cached: 0, failed: 0, current: "" });
            setShowPrecacheBar(true);
          }
        } else if (data.type === "PRECACHE_PROGRESS") {
          if (!dismissedRef.current) {
            setPrecache({
              status: "downloading",
              total: data.total,
              cached: data.cached,
              failed: data.failed,
              current: data.current,
            });
            setShowPrecacheBar(true);
          }
        } else if (data.type === "PRECACHE_QUOTA_EXCEEDED") {
          setPrecache({
            status: "quota_exceeded",
            total: data.total,
            cached: data.cached,
            failed: data.failed,
            current: "",
          });
        } else if (data.type === "PRECACHE_DONE") {
          setPrecache({
            status: data.quotaExceeded ? "quota_exceeded" : "done",
            total: data.total,
            cached: data.cached,
            failed: data.failed,
            current: "",
          });
          if (!data.quotaExceeded && data.failed === 0) {
            setTimeout(() => setShowPrecacheBar(false), 5000);
          }
        } else if (data.type === "PRECACHE_STATUS") {
          // SW reports existing precache status (done or not)
          if (data.done) {
            setPrecache({
              status: data.quotaExceeded ? "quota_exceeded" : "done",
              total: data.total,
              cached: data.cached,
              failed: data.failed,
              current: "",
            });
          }
        } else if (data.type === "PRECACHE_ERROR") {
          setPrecache((prev) => ({ ...prev, status: "error" }));
        }
      };

      navigator.serviceWorker.addEventListener("message", messageHandler);
    }

    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      if (messageHandler) {
        navigator.serviceWorker.removeEventListener("message", messageHandler);
      }
    };
  }, []);

  const handleStartDownload = useCallback(() => {
    dismissedRef.current = false;
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "START_PRECACHE" });
    } else {
      // SW not yet controlling, try again after registration
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) {
          reg.active.postMessage({ type: "START_PRECACHE" });
        }
      });
    }
  }, []);

  const progress =
    precache.total > 0 ? Math.round((precache.cached / precache.total) * 100) : 0;

  return (
    <>
      {/* iOS storage warning */}
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

      {/* Download button (shown when idle and not yet downloaded) */}
      {precache.status === "idle" && (
        <button
          onClick={handleStartDownload}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Tải truyện để đọc offline
        </button>
      )}

      {/* Offline indicator */}
      {isOffline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
          Đang offline
        </div>
      )}

      {/* Pre-cache progress bar */}
      {showPrecacheBar && precache.status === "downloading" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg shadow-xl px-4 py-3 min-w-[300px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              Tải truyện để đọc offline
            </span>
            <button
              onClick={() => {
                dismissedRef.current = true;
                setShowPrecacheBar(false);
              }}
              className="text-zinc-500 hover:text-white ml-2 shrink-0"
            >
              ✕
            </button>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2 mb-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span className="truncate max-w-[200px]">{precache.current}</span>
            <span className="shrink-0 ml-2">
              {precache.cached}/{precache.total}
            </span>
          </div>
        </div>
      )}

      {/* Pre-cache complete */}
      {showPrecacheBar && precache.status === "done" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <span>✓</span>
          {precache.failed === 0
            ? `Đã tải ${precache.cached}/${precache.total} truyện - Sẵn sàng đọc offline`
            : `Đã tải ${precache.cached}/${precache.total} (${precache.failed} lỗi)`}
          <button
            onClick={() => setShowPrecacheBar(false)}
            className="text-green-300 hover:text-white ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pre-cache quota exceeded (iOS storage limit) */}
      {showPrecacheBar && precache.status === "quota_exceeded" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white text-xs rounded-lg shadow-xl px-4 py-3 max-w-[90vw]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium mb-1">⚠️ Hết dung lượng lưu trữ</p>
              <p className="text-amber-100 leading-relaxed">
                Đã tải {precache.cached}/{precache.total} truyện. Trình duyệt không cho lưu thêm. Các truyện đã tải vẫn đọc offline được.
              </p>
            </div>
            <button
              onClick={() => setShowPrecacheBar(false)}
              className="text-amber-200 hover:text-white shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
