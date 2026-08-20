"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";

interface NovelCardProps {
  novel: {
    id: string;
    title: string;
    totalPages: number;
    coverUrl?: string | null;
  };
  progress?: {
    currentPage: number;
    percentage: number;
  };
}

export function NovelCard({ novel, progress }: NovelCardProps) {
  const isStarted = progress && progress.currentPage > 1;
  const isCompleted = progress && progress.percentage >= 100;
  const hasCover = !!novel.coverUrl;

  const volumeMatch = novel.title.match(/level\s*([0-9]+)/i);
  const volumeNumber = volumeMatch ? parseInt(volumeMatch[1], 10) : null;

  return (
    <Link href={`/read/${novel.id}`} className="block min-w-0">
      <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 h-full overflow-hidden">
        {/* Cover */}
        <div className="relative aspect-[3/4] bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
          {hasCover ? (
            <img
              src={novel.coverUrl!}
              alt={novel.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400">
              <BookOpen className="w-8 h-8 sm:w-12 sm:h-12 mb-1 sm:mb-2" />
              <span className="text-[10px] sm:text-sm">Grimgar</span>
            </div>
          )}

          {/* Volume badge */}
          {volumeNumber && (
            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
              <Badge
                variant="secondary"
                className="bg-white/90 dark:bg-zinc-900/90 shadow-sm text-[10px] sm:text-xs"
              >
                Vol {volumeNumber}
              </Badge>
            </div>
          )}

          {/* Progress overlay */}
          {isStarted && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 sm:p-2">
              <Progress value={progress.percentage} className="h-1" />
            </div>
          )}

          {/* Completed badge */}
          {isCompleted && (
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
              <Badge variant="default" className="bg-green-500 text-[10px] sm:text-xs">
                Hoàn thành
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-2 sm:p-3">
          <h3 className="font-medium text-xs sm:text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {novel.title}
          </h3>

          <div className="mt-1 sm:mt-2 flex items-center justify-between text-[10px] sm:text-xs text-zinc-500">
            <span>{novel.totalPages} trang</span>
            {isStarted && (
              <span className="flex items-center gap-0.5 sm:gap-1">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {progress.percentage}%
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
