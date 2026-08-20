// LocalStorage-based storage for client-side only

export interface ReadingProgress {
  currentPage: number;
  percentage: number;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  novelId: string;
  page: number;
  note: string;
  createdAt: string;
}

// Progress storage - individual keys per novel
export function getNovelProgress(novelId: string): ReadingProgress | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(`grimgar_progress_${novelId}`);
  return data ? JSON.parse(data) : null;
}

export function setProgress(novelId: string, page: number, percentage: number): void {
  if (typeof window === 'undefined') return;
  const progress: ReadingProgress = {
    currentPage: page,
    percentage,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(`grimgar_progress_${novelId}`, JSON.stringify(progress));
}

export function getProgress(): Record<string, ReadingProgress> {
  if (typeof window === 'undefined') return {};
  const result: Record<string, ReadingProgress> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('grimgar_progress_')) {
      const novelId = key.replace('grimgar_progress_', '');
      const data = localStorage.getItem(key);
      if (data) {
        result[novelId] = JSON.parse(data);
      }
    }
  }

  return result;
}

// Bookmarks storage
const BOOKMARKS_KEY = 'grimgar_bookmarks';

export function getBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(BOOKMARKS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getNovelBookmarks(novelId: string): Bookmark[] {
  return getBookmarks().filter(b => b.novelId === novelId);
}

export function addBookmark(novelId: string, page: number, note: string): Bookmark {
  const bookmarks = getBookmarks();
  const newBookmark: Bookmark = {
    id: `bm-${Date.now()}`,
    novelId,
    page,
    note,
    createdAt: new Date().toISOString(),
  };
  bookmarks.push(newBookmark);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  return newBookmark;
}

export function deleteBookmark(bookmarkId: string): void {
  const bookmarks = getBookmarks().filter(b => b.id !== bookmarkId);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}
