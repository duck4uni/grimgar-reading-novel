# Grimgar Reader

Ứng dụng đọc truyện/light novel **Grimgar** trực tuyến, xây dựng bằng Next.js 16, React 19, và pdf.js. Hỗ trợ đọc PDF trên cả desktop và mobile (iOS/Android), với theo dõi tiến độ, bookmark, và tự động trích xuất ảnh bìa.

**Live:** https://grimgar-reading-novel.vercel.app/

---

## Tính năng

- **Thư viện truyện** — hiển thị 24 tập Grimgar (Level 1–22, gồm 14+, 14++) với ảnh bìa tự động trích xuất từ trang đầu PDF
- **Đọc PDF** — render bằng pdf.js (react-pdf), hỗ trợ zoom, chuyển trang, fullscreen
- **Tiến độ đọc** — tự động lưu trang hiện tại vào `localStorage`, hiển thị % trên thư viện
- **Bookmark** — đánh dấu trang kèm ghi chú, quản lý bookmark trong reader
- **Responsive** — tối ưu cho mobile: toolbar scroll ngang, zoom mặc định 125%, vuốt để chuyển trang
- **Tap direction** — đổi chiều tap trái/phải để chuyển trang (cho người thuận tay trái)
- **Dark mode** — tự động theo hệ điều hành
- **Tìm kiếm & sắp xếp** — theo tên hoặc theo số tập

---

## Tech stack

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| PDF rendering | pdfjs-dist 6 + react-pdf 10 |
| Icons | lucide-react |
| Storage | localStorage (client-side only) |
| Deploy | Vercel |
| Large files | Git LFS (file PDF) |

---

## Cấu trúc dự án

```
reading-project/
├── public/
│   ├── novels/              # File PDF (track qua Git LFS)
│   └── pdf.worker.min.mjs   # pdf.js worker (generate bởi prebuild, không commit)
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout + eruda debug
│   │   ├── page.tsx         # Trang thư viện (home)
│   │   ├── globals.css      # Tailwind v4 + theme + scrollbar styles
│   │   └── read/[id]/
│   │       └── page.tsx     # Trang reader
│   ├── components/
│   │   ├── pdf-viewer.tsx   # PDF viewer component (react-pdf)
│   │   ├── novel-card.tsx   # Card hiển thị 1 cuốn truyện
│   │   ├── bookmark-list.tsx# Quản lý bookmark
│   │   ├── eruda-debug.tsx  # Mobile debug console (eruda)
│   │   └── ui/              # shadcn/ui components (button, input, ...)
│   └── lib/
│       ├── novels-data.ts   # Danh sách 24 tập (static data)
│       ├── cover-extractor.ts # Trích xuất ảnh bìa từ PDF
│       ├── polyfills.ts     # Polyfills cho iOS Safari 16-17
│       ├── storage.ts       # localStorage: progress + bookmarks
│       ├── settings.ts      # localStorage: tap direction setting
│       └── utils.ts         # Utilities (cn helper)
├── .gitattributes           # Git LFS: *.pdf filter=lfs
├── vercel.json              # Vercel config: cache headers cho PDF
├── tailwind.config.ts       # Tailwind v4 config
├── postcss.config.mjs       # PostCSS + @tailwindcss/postcss
└── package.json
```

---

## Yêu cầu hệ thống

- **Node.js** 18.17+ (khuyến nghị 20+)
- **npm** 10+
- **Git LFS** (để clone/push file PDF) — [cài đặt](https://git-lfs.com/)

---

## Cài đặt & chạy local

### 1. Clone repo

```bash
git clone https://github.com/duck4uni/grimgar-reading-novel.git
cd grimgar-reading-novel
```

> **Lưu ý Git LFS:** File PDF được track qua Git LFS. Sau khi clone, chạy `git lfs pull` để tải nội dung PDF thật. Nếu chưa cài Git LFS:
> ```bash
> git lfs install
> git lfs pull
> ```

### 2. Cài dependencies

```bash
npm install
```

### 3. Chạy dev server

```bash
npm run dev
```

Mở http://localhost:3000

> **pdf.js worker:** Worker file (`public/pdf.worker.min.mjs`) được tự động copy bởi `prebuild` script khi chạy `npm run build`. Khi chạy `npm run dev`, nếu worker chưa có, chạy thủ công:
> ```bash
> npm run prebuild
> ```

---

## Build production

```bash
npm run build
```

Quá trình build:
1. **`prebuild`** — copy `pdf.worker.min.mjs` từ `node_modules/pdfjs-dist/legacy/build/` vào `public/` (dùng legacy build cho tương thích iOS)
2. **`next build`** — build Next.js production (Turbopack)

Chạy production server:
```bash
npm run start
```

---

## Deploy lên Vercel

### Tự động (GitHub integration)

1. Push code lên `main` branch → Vercel tự động build & deploy
2. Domain: https://grimgar-reading-novel.vercel.app/

### Cài đặt Vercel quan trọng

- **Git LFS:** Vào Project Settings → Git → bật **Git Large File Storage (LFS)**. Nếu không bật, Vercel chỉ serve LFS pointer file (130 bytes text) thay vì PDF thật → lỗi "Invalid PDF structure".
- **Build command:** `npm run build` (đã set trong `vercel.json`)
- **Install command:** `npm install`

### Thủ công (Vercel CLI)

```bash
npm i -g vercel
vercel          # deploy preview
vercel --prod   # deploy production
```

---

## Debug trên mobile

### Eruda (khuyên dùng cho iOS)

Thêm `?debug=1` vào URL để bật eruda console trên mobile:

```
https://grimgar-reading-novel.vercel.app/?debug=1
https://grimgar-reading-novel.vercel.app/read/1?debug=1
```

Sẽ thấy **nút bánh răng cưa** ở góc màn hình → bấm vào để mở DevTools:
- **Console** — xem `console.log`, lỗi JS
- **Network** — xem requests, status, responses
- **Elements** — inspect DOM

> Eruda chỉ load khi có `?debug=1` để không ảnh hưởng performance user thường.

### Safari Web Inspector (Mac + iPhone)

1. iPhone: Settings → Safari → Advanced → bật **Web Inspector**
2. Kết nối iPhone với Mac qua cable
3. Mac: Safari → Develop → [tên iPhone] → [tab đang mở]
4. Xem Console, Network, Elements như DevTools desktop

### Chrome DevTools (Android)

1. Kết nối Android với máy qua USB
2. Chrome desktop → `chrome://inspect` → inspect tab trên điện thoại

---

## Lint

```bash
npm run lint
```

---

## Lưu ý kỹ thuật

### iOS Safari 16-17 compatibility

pdfjs-dist v6 dùng các JS features mới không có trên iOS Safari cũ:
- `URL.parse()` — Safari 18+
- `Promise.withResolvers()` — Safari 17.4+
- `Iterator` global — Safari 17.4+

**Fix:**
- `src/lib/polyfills.ts` — polyfill 3 function trên, import trước react-pdf
- `prebuild` copy **legacy** worker (`legacy/build/pdf.worker.min.mjs`) — worker chạy trong Web Worker thread riêng, không nhận polyfills từ main thread, nên phải dùng legacy build

### Cache busting PDF

URL PDF có `?v=2` query param để tránh browser cache cũ (LFS pointer file từ trước khi bật Git LFS trên Vercel).

### Range requests

iOS Safari có vấn đề với HTTP range requests khi load PDF. Component truyền `disableRange: true` + `disableAutoFetch: true` cho pdfjs để tải toàn bộ file thay vì stream.

### Git LFS

File PDF (~110MB tổng, 24 file) được track qua Git LFS (`.gitattributes`: `*.pdf filter=lfs`). Không commit PDF trực tiếp vào repo để tránh phình repo.

---

## License

Private project.
