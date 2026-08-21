// Polyfills for older browsers (iOS Safari 16-17, etc.)
// pdfjs-dist v4 uses Promise.withResolvers which is only available
// in Safari 17.4+. This polyfill makes it work on older Safari versions.

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

export {};
