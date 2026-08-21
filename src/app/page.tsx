"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NovelCard } from "@/components/novel-card";
import { Search, BookOpen, ArrowUpDown } from "lucide-react";
import { STATIC_NOVELS, NovelData } from "@/lib/novels-data";
import { getProgress } from "@/lib/storage";
import { extractCoverImage } from "@/lib/cover-extractor";
import { DownloadButton } from "@/components/download-button";

export default function LibraryPage() {
  const [novels] = useState<NovelData[]>(STATIC_NOVELS);
  const [progress, setProgress] = useState<Record<string, { currentPage: number; percentage: number }>>({});
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "volume">("volume");

  // Load progress and covers
  useEffect(() => {
    const savedProgress = getProgress();
    setProgress(savedProgress);

    novels.forEach(async (novel) => {
      const pdfUrl = `/novels/${encodeURIComponent(novel.filename)}?v=2`;
      const cover = await extractCoverImage(pdfUrl, novel.id);
      if (cover) {
        setCovers(prev => ({ ...prev, [novel.id]: cover }));
      }
    });
  }, [novels]);

  const getVolumeNumber = (novel: NovelData): number => {
    const match = novel.title.match(/^Level\s*([0-9]+)/i);
    return match ? parseInt(match[1], 10) : 999;
  };

  const filteredNovels = novels
    .filter((novel) =>
      novel.title.toLowerCase().includes(search.toLowerCase()) ||
      novel.filename.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "volume") {
        const aNum = getVolumeNumber(a);
        const bNum = getVolumeNumber(b);
        if (aNum !== bNum) return aNum - bNum;
        const aIsExtra = a.title.includes("+");
        const bIsExtra = b.title.includes("+");
        if (aIsExtra !== bIsExtra) return aIsExtra ? 1 : -1;
        return 0;
      }
      return getVolumeNumber(a) - getVolumeNumber(b);
    });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-bold">Grimgar</h1>
            </Link>

            <div className="flex items-center gap-1 sm:gap-2">
              <DownloadButton />
              <button
                onClick={() => setSortBy(sortBy === "volume" ? "title" : "volume")}
                className="flex items-center gap-1 sm:gap-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
              >
                <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{sortBy === "volume" ? "Theo tập" : "Theo tên"}</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="search"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-2 sm:px-4 py-4 sm:py-6">
        {filteredNovels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-zinc-500">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 opacity-50" />
            <h2 className="text-lg sm:text-xl font-medium mb-2">Không tìm thấy</h2>
            <p className="text-sm">Thử từ khóa khác</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {filteredNovels.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={{
                  id: novel.id,
                  title: novel.title,
                  totalPages: novel.totalPages,
                  coverUrl: covers[novel.id] || null,
                }}
                progress={progress[novel.id]}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
