"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookmarkList } from "@/components/bookmark-list";
import { STATIC_NOVELS, NovelData } from "@/lib/novels-data";
import {
  getNovelProgress,
  setProgress,
  getNovelBookmarks,
  addBookmark,
  deleteBookmark,
} from "@/lib/storage";
import {
  ArrowLeft,
  Loader2,
  RotateCcw,
} from "lucide-react";

// Dynamic import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@/components/pdf-viewer").then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-zinc-900">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  ),
});

export default function ReaderPage() {
  const params = useParams();
  const novelId = params.id as string;

  const [novel, setNovel] = useState<NovelData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [progress, setProgressState] = useState<{ currentPage: number; percentage: number } | null>(null);
  const [bookmarks, setBookmarks] = useState<Array<{ id: string; page: number; note: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Load novel data and saved state
  useEffect(() => {
    const foundNovel = STATIC_NOVELS.find(n => n.id === novelId);
    if (foundNovel) {
      setNovel(foundNovel);
      document.title = `${foundNovel.title} - Grimgar Reader`;

      // Load progress
      const savedProgress = getNovelProgress(novelId);
      if (savedProgress) {
        setProgressState(savedProgress);
        setCurrentPage(savedProgress.currentPage);
      }

      // Load bookmarks
      setBookmarks(getNovelBookmarks(novelId));
    }
    setLoading(false);
  }, [novelId]);

  // Update progress
  const handleProgressUpdate = useCallback(
    (page: number, percentage: number) => {
      setProgress(novelId, page, percentage);
      setProgressState({ currentPage: page, percentage });
    },
    [novelId]
  );

  // Add bookmark
  const handleAddBookmark = useCallback(
    (page: number, note: string) => {
      const newBookmark = addBookmark(novelId, page, note);
      setBookmarks(prev => [newBookmark, ...prev]);
    },
    [novelId]
  );

  // Delete bookmark
  const handleDeleteBookmark = useCallback(
    (bookmarkId: string) => {
      deleteBookmark(bookmarkId);
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    },
    [novelId]
  );

  // Clear progress
  const handleClearProgress = useCallback(() => {
    if (confirm("Xóa tiến độ đọc của volume này?")) {
      localStorage.removeItem(`grimgar_progress_${novelId}`);
      setProgressState(null);
      setCurrentPage(1);
    }
  }, [novelId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-xl font-medium">Không tìm thấy truyện</h1>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại thư viện
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-900 overflow-hidden">
      {/* Header */}
      <header className="bg-zinc-800 border-b border-zinc-700 px-2 sm:px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Back button */}
          <Link href="/" className="flex items-center justify-center w-8 h-8 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-md shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Title & Progress */}
          <div className="flex-1 min-w-0">
            <h1 className="font-medium text-white truncate text-xs sm:text-sm">{novel.title}</h1>
            <span className="text-zinc-500 text-[10px] sm:text-xs">
              {currentPage} / {novel.totalPages}
              {progress && ` • ${progress.percentage}%`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {progress && (
              <button
                onClick={handleClearProgress}
                className="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md"
                title="Reset tiến độ"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <BookmarkList
              bookmarks={bookmarks}
              currentPage={currentPage}
              onAddBookmark={handleAddBookmark}
              onDeleteBookmark={handleDeleteBookmark}
              onGoToPage={(page) => setCurrentPage(page)}
            />
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <PDFViewer
          pdfUrl={`/novels/${encodeURIComponent(novel.filename)}`}
          initialPage={currentPage}
          totalPages={novel.totalPages}
          onProgressUpdate={handleProgressUpdate}
        />
      </div>
    </div>
  );
}
