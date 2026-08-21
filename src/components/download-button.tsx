"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Download, Loader2, Check, AlertTriangle } from "lucide-react";

type PrecacheStatus = "idle" | "downloading" | "done" | "error" | "quota_exceeded";

export function DownloadButton() {
  const [status, setStatus] = useState<PrecacheStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [cached, setCached] = useState(0);
  const [showPopover, setShowPopover] = useState(false);
  const popoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data?.type) return;

      if (data.type === "PRECACHE_START") {
        setStatus("downloading");
        setProgress(0);
        setTotal(data.total);
        setCached(0);
        setShowPopover(true);
      } else if (data.type === "PRECACHE_PROGRESS") {
        setStatus("downloading");
        setTotal(data.total);
        setCached(data.cached);
        setProgress(data.total > 0 ? Math.round((data.cached / data.total) * 100) : 0);
      } else if (data.type === "PRECACHE_DONE") {
        setStatus(data.quotaExceeded ? "quota_exceeded" : "done");
        setTotal(data.total);
        setCached(data.cached);
        setProgress(100);
        if (popoverTimer.current) clearTimeout(popoverTimer.current);
        popoverTimer.current = setTimeout(() => setShowPopover(false), 4000);
      } else if (data.type === "PRECACHE_STATUS") {
        if (data.done) {
          setStatus(data.quotaExceeded ? "quota_exceeded" : "done");
          setTotal(data.total);
          setCached(data.cached);
        }
      } else if (data.type === "PRECACHE_ERROR") {
        setStatus("error");
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);

    navigator.serviceWorker.ready.then((reg) => {
      if (reg.active) {
        reg.active.postMessage({ type: "CHECK_PRECACHE_STATUS" });
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
      if (popoverTimer.current) clearTimeout(popoverTimer.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (status === "downloading") {
      setShowPopover(!showPopover);
      return;
    }

    if (status === "done" || status === "quota_exceeded" || status === "error") {
      setShowPopover(!showPopover);
      return;
    }

    setShowPopover(true);
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "START_PRECACHE" });
    } else {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: "START_PRECACHE" });
      });
    }
  }, [status, showPopover]);

  const renderIcon = () => {
    switch (status) {
      case "downloading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "done":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
      case "quota_exceeded":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const tooltipText = () => {
    switch (status) {
      case "downloading":
        return `Đang tải... ${progress}%`;
      case "done":
        return `Đã tải ${cached}/${total} truyện`;
      case "error":
        return "Lỗi tải xuống";
      case "quota_exceeded":
        return "Hết dung lượng";
      default:
        return "Tải truyện để đọc offline";
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={handleClick}
        className="flex items-center justify-center w-8 h-8 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
        title={tooltipText()}
      >
        {renderIcon()}
      </button>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
          <div className="absolute top-full right-0 mt-1 z-50 bg-zinc-900 text-white text-xs rounded-lg shadow-xl px-3 py-2.5 min-w-[200px] max-w-[280px]">
            {status === "downloading" && (
              <>
                <p className="font-medium mb-2 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Đang tải truyện...
                </p>
                <div className="w-full bg-zinc-700 rounded-full h-1.5 mb-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-zinc-400 text-[10px]">{cached}/{total} truyện</p>
              </>
            )}
            {status === "done" && (
              <p className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-green-500" />
                Đã tải {cached}/{total} truyện. Sẵn sàng đọc offline!
              </p>
            )}
            {status === "quota_exceeded" && (
              <p className="text-amber-400 leading-relaxed">
                Đã tải {cached}/{total}. Hết dung lượng, vẫn đọc offline được truyện đã tải.
              </p>
            )}
            {status === "error" && (
              <p className="text-red-400">Có lỗi xảy ra. Thử lại sau.</p>
            )}
            {status === "idle" && (
              <p>Tải tất cả truyện để đọc offline?</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
