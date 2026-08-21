"use client";

import "@/lib/polyfills";
import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronFirst,
  ChevronLast,
  Eye,
  EyeOff,
  ArrowLeftRight,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getTapDirection, toggleTapDirection } from "@/lib/settings";

// Set up PDF.js worker (legacy build for iOS Safari 16+ compatibility)
// Override react-pdf's default workerSrc which points to a relative path
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFViewerProps {
  pdfUrl: string;
  initialPage?: number;
  totalPages: number;
  onProgressUpdate?: (page: number, percentage: number) => void;
  className?: string;
}

export default function PDFViewer({
  pdfUrl,
  initialPage = 1,
  totalPages: initialTotalPages,
  onProgressUpdate,
  className = "",
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(initialTotalPages || 0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(() => (typeof window !== "undefined" && window.innerWidth < 768 ? 1.25 : 1.0));
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [tapDirection, setTapDirection] = useState<'normal' | 'reversed'>('normal');
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedPage = useRef<number>(initialPage);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile and measure container
  useEffect(() => {
    const updateDimensions = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowControls(false);
      }
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // Load tap direction setting
    setTapDirection(getTapDirection());

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Toggle controls visibility
  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);

    // Auto-hide after 3 seconds on mobile
    if (!showControls && isMobile) {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [showControls, isMobile]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
    },
    []
  );

  // Navigation functions
  const goToPrevPage = useCallback(() => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  }, [numPages]);

  const goToPage = useCallback((page: number) => {
    const pageNum = Math.max(1, Math.min(page, numPages));
    setPageNumber(pageNum);
  }, [numPages]);

  const goToFirst = useCallback(() => setPageNumber(1), []);
  const goToLast = useCallback(() => setPageNumber(numPages), [numPages]);

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.25, 3)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.25, 0.5)), []);

  // Toggle tap direction
  const handleToggleTapDirection = useCallback(() => {
    const next = toggleTapDirection();
    setTapDirection(next);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Exit fullscreen handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && isMobile) {
        setShowControls(false);
      }
      setTimeout(() => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      }, 100);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isMobile]);

  // Handle click on left/right zones for page navigation (works on all devices)
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Left 30% = prev page, Right 30% = next page, Middle = toggle controls
    // (or reversed if tapDirection is 'reversed')
    const leftZone = width * 0.3;
    const rightZone = width * 0.7;

    if (tapDirection === 'normal') {
      if (x < leftZone) {
        goToPrevPage();
      } else if (x > rightZone) {
        goToNextPage();
      } else {
        toggleControls();
      }
    } else {
      // Reversed: left = next, right = prev
      if (x < leftZone) {
        goToNextPage();
      } else if (x > rightZone) {
        goToPrevPage();
      } else {
        toggleControls();
      }
    }
  }, [goToPrevPage, goToNextPage, toggleControls, tapDirection]);

  // Touch swipe support
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only register as swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (tapDirection === 'normal') {
        if (deltaX > 0) {
          goToPrevPage();
        } else {
          goToNextPage();
        }
      } else {
        // Reversed
        if (deltaX > 0) {
          goToNextPage();
        } else {
          goToPrevPage();
        }
      }
    }
  }, [isMobile, goToPrevPage, goToNextPage, tapDirection]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        goToPrevPage();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        goToNextPage();
      } else if (e.key === "Home") {
        goToFirst();
      } else if (e.key === "End") {
        goToLast();
      } else if (e.key === "+" || e.key === "=") {
        zoomIn();
      } else if (e.key === "-") {
        zoomOut();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "h" || e.key === "H") {
        toggleControls();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextPage, goToPrevPage, goToPage, goToFirst, goToLast, zoomIn, zoomOut, toggleFullscreen, toggleControls]);

  // Notify parent of page changes (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (pageNumber !== lastSavedPage.current) {
        lastSavedPage.current = pageNumber;
        const percentage = numPages > 0 ? Math.round((pageNumber / numPages) * 100) : 0;
        onProgressUpdate?.(pageNumber, percentage);
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [pageNumber, numPages, onProgressUpdate]);

  // Page input handler
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") return;
    const page = parseInt(value, 10);
    if (!isNaN(page)) {
      goToPage(page);
    }
  };

  // Calculate page width - fit to container on mobile
  const pageWidth = isMobile ? containerWidth : undefined;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-zinc-900 ${className} ${isFullscreen ? "fixed inset-0 z-50" : ""}`}
    >
      {/* Toggle Controls Button */}
      <button
        onClick={toggleControls}
        className={`absolute top-2 right-2 z-20 bg-zinc-800/80 backdrop-blur-sm rounded-full p-2 text-white hover:bg-zinc-700 transition-opacity ${
          showControls ? "opacity-100" : "opacity-70 hover:opacity-100"
        }`}
        title={showControls ? "Ẩn công cụ (H)" : "Hiện công cụ (H)"}
      >
        {showControls ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>

      {/* Top Toolbar */}
      <div
        className={`flex items-center gap-1 sm:gap-2 p-2 bg-zinc-800/95 backdrop-blur border-b border-zinc-700 transition-all duration-300 shrink-0 overflow-x-auto no-scrollbar ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        {/* Navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToFirst}
            disabled={pageNumber <= 1}
            className="text-white hover:bg-zinc-700 h-8 w-8 p-0"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="text-white hover:bg-zinc-700 h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page input */}
          <div className="flex items-center gap-1 text-white text-sm shrink-0">
            <Input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={handlePageInputChange}
              className="w-12 sm:w-14 h-8 text-center bg-zinc-700 border-zinc-600 text-white text-sm"
            />
            <span className="whitespace-nowrap">/ {numPages}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="text-white hover:bg-zinc-700 h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToLast}
            disabled={pageNumber >= numPages}
            className="text-white hover:bg-zinc-700 h-8 w-8 p-0"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>

        {/* Spacer pushes right controls to end on wider screens */}
        <div className="flex-1 min-w-0" />

        {/* Right controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Tap direction toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleTapDirection}
            className={`h-8 w-8 p-0 ${tapDirection === 'reversed' ? 'text-yellow-400 hover:text-yellow-300' : 'text-white hover:bg-zinc-700'}`}
            title={tapDirection === 'normal' ? 'Bấm trái: Lùi, Phải: Tiến' : 'Bấm trái: Tiến, Phải: Lùi'}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          {/* Zoom */}
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            className="text-white hover:bg-zinc-700 h-8 w-8 p-0"
            title="Thu nhỏ"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white text-xs w-10 sm:w-12 text-center shrink-0">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            className="text-white hover:bg-zinc-700 h-8 w-8 p-0"
            title="Phóng to"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-zinc-700 h-8 w-8 p-0"
            title={isFullscreen ? "Thoát toàn màn hình (F)" : "Toàn màn hình (F)"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* PDF Content - click zones for navigation */}
      <div
        className="flex-1 overflow-auto flex justify-center cursor-pointer select-none"
        onClick={handleContentClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Document
          file={{ url: pdfUrl, disableRange: true, disableAutoFetch: true } as any}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-[70vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center h-[70vh] text-white">
              <p>Không thể tải PDF</p>
              <p className="text-sm text-zinc-400 mt-2">Vui lòng kiểm tra lại file</p>
              <p className="text-xs text-zinc-500 mt-1">{pdfUrl}</p>
            </div>
          }
          onError={(error) => console.error("PDF load error:", error, "URL:", pdfUrl)}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            width={pageWidth}
            className="shadow-2xl"
            renderTextLayer={!isMobile}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {/* Mobile hint */}
      {isMobile && !showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none">
          Nhấn giữa màn hình để hiện công cụ
        </div>
      )}
    </div>
  );
}
