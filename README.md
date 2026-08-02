# Henry Chen 的閱讀隨筆

以 Astro 建立的繁體中文個人長文網站。內容採 Markdown，支援手機閱讀、深色模式、全文搜尋、標籤、年份索引、作者索引與相關文章。

## 開始使用

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

開啟 `http://localhost:4321`。

## 建置

```bash
npm run build
npm run preview
```

`npm run build` 會先輸出 Astro 靜態網站，再由 Pagefind 在 `dist/pagefind/` 建立全文搜尋索引。

## 新增文章

在 `src/content/articles/` 新增 Markdown：

```md
---
title: 文章標題
description: 一段簡短摘要
published: 2026-07-30
category: 閱讀隨筆
author: Henry Chen
bookAuthor: 書籍作者
tags: [台灣文學, 歷史]
featured: false
draft: false
readingNumber: 14
---

正文從這裡開始。
```

`category` 必須是以下其中之一：

- 閱讀隨筆
- 歷史與文明
- 科技
- 廈門大稻埕陳氏

## 網址與部署

請先把 `astro.config.mjs` 的 `site` 改成正式網址。

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`

### Vercel

- Framework preset: Astro
- Build command: `npm run build`
- Output directory: `dist`

### Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: 22

## 專案結構

- `src/content/articles/`：Markdown 文章
- `src/content.config.ts`：文章欄位定義
- `src/pages/`：首頁、分類、索引與搜尋頁
- `src/layouts/`：基礎版型與文章版型
- `src/styles.css`：全站排版與深色模式
- `src/lib/articles.ts`：排序、分類與相關文章邏輯
