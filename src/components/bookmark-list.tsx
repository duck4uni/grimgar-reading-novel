"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bookmark, Plus, Trash2, FileText } from "lucide-react";

interface Bookmark {
  id: string;
  page: number;
  note: string;
  createdAt: Date | string;
}

interface BookmarkListProps {
  bookmarks: Bookmark[];
  currentPage: number;
  onGoToPage: (page: number) => void;
  onAddBookmark: (page: number, note: string) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  className?: string;
}

export function BookmarkList({
  bookmarks,
  currentPage,
  onGoToPage,
  onAddBookmark,
  onDeleteBookmark,
  className = "",
}: BookmarkListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");

  const handleAddBookmark = useCallback(() => {
    if (note.trim()) {
      onAddBookmark(currentPage, note.trim());
      setNote("");
      setIsOpen(false);
    }
  }, [currentPage, note, onAddBookmark]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={`inline-flex items-center justify-center gap-1 hover:bg-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:text-white ${className || ""}`}>
        <Bookmark className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Đánh dấu</span>
        {bookmarks.length > 0 && <span className="ml-1">({bookmarks.length})</span>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle>Danh sách đánh dấu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add current position */}
          <div className="flex gap-2">
            <Input
              placeholder="Ghi chú (tùy chọn)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBookmark()}
            />
            <Button onClick={handleAddBookmark} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Trang {currentPage}
            </Button>
          </div>

          {/* Bookmark list */}
          <ScrollArea className="h-[300px]">
            {bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-8">
                <Bookmark className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Chưa có đánh dấu nào</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 group"
                  >
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <button
                      onClick={() => onGoToPage(bookmark.page)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium">
                        Trang {bookmark.page}
                      </div>
                      {bookmark.note && (
                        <div className="text-xs text-zinc-500 truncate">
                          {bookmark.note}
                        </div>
                      )}
                      <div className="text-xs text-zinc-400">
                        {formatDate(bookmark.createdAt)}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onDeleteBookmark(bookmark.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
