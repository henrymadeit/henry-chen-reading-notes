

## 專案結構

- `src/content/articles/`：Markdown 文章
- `src/content.config.ts`：文章欄位定義
- `src/pages/`：首頁、分類、索引與搜尋頁
- `src/layouts/`：基礎版型與文章版型
- `src/styles.css`：全站排版與深色模式
- `src/lib/articles.ts`：排序、分類與相關文章邏輯
# Henry Chen Reading Notes

Personal reading notes website built with Astro.

---

## Project Structure

```
src
├── content
│   ├── articles
│   │      *.md
│   │      Article content
│   │
│   └── content.config.ts
│          Defines article fields
│
├── layouts
│      ArticleLayout.astro
│      Controls article layout
│
└── styles.css
       Global appearance
```

---

## Data Flow

```
Markdown (.md)
        ↓
content.config.ts
        ↓
ArticleLayout.astro
        ↓
styles.css
```

When adding a new feature, these files usually need to stay aligned.

Example: takeaway

```
content.config.ts
        ↓
article.md
        ↓
ArticleLayout.astro
        ↓
styles.css
```