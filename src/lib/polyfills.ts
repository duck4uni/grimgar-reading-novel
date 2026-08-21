// Polyfills for older browsers (iOS Safari 16-17, etc.)
// pdfjs-dist v6 uses these modern JS features that aren't available
// on older Safari versions.

// Promise.withResolvers (Safari 17.4+)
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    // @ts-expect-error assigned in promise executor
    return { promise, resolve, reject };
  };
}

// URL.parse (Safari 18+)
if (typeof URL.parse !== "function") {
  URL.parse = function parse(url: string, base?: string | URL): URL | null {
    try {
      return base ? new URL(url, base) : new URL(url);
    } catch {
      return null;
    }
  };
}

// Iterator (Safari 17.4+ via Symbol.iterator, but global Iterator constructor is newer)
// Minimal polyfill for pdfjs usage
if (typeof (globalThis as unknown as { Iterator?: unknown }).Iterator === "undefined") {
  (globalThis as unknown as { Iterator: unknown }).Iterator = Object;
}

export {};
