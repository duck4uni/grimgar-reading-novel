// Extract cover image from first page of PDF
// Uses pdf.js to render first page as canvas, then converts to data URL

const coverCache: Record<string, string> = {};

export async function extractCoverImage(pdfUrl: string, novelId: string): Promise<string | null> {
  // Check cache first
  if (coverCache[novelId]) {
    return coverCache[novelId];
  }

  // Check localStorage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`grimgar_cover_${novelId}`);
    if (cached) {
      coverCache[novelId] = cached;
      return cached;
    }
  }

  try {
    // Dynamically import pdf.js
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    // Fetch the PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error('Failed to fetch PDF');

    const arrayBuffer = await response.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Get first page
    const page = await pdf.getPage(1);

    // Calculate scale for a good cover size
    const viewport = page.getViewport({ scale: 1 });
    const scale = 400 / viewport.width; // Target width 400px
    const scaledViewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      canvas,
    }).promise;

    // Convert to data URL (JPEG for smaller size)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Cache it
    coverCache[novelId] = dataUrl;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`grimgar_cover_${novelId}`, dataUrl);
    }

    return dataUrl;
  } catch (error) {
    console.error('Error extracting cover:', error);
    return null;
  }
}

// Clear all cached covers
export function clearCoverCache(novelId?: string) {
  if (novelId) {
    delete coverCache[novelId];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`grimgar_cover_${novelId}`);
    }
  } else {
    // Clear all
    Object.keys(coverCache).forEach(key => delete coverCache[key]);
    if (typeof window !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('grimgar_cover_')) {
          localStorage.removeItem(key);
        }
      }
    }
  }
}
