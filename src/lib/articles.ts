import type { CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'articles'>;

export const categories = ['閱讀隨筆', '歷史與文明', '旅遊隨筆', '台灣與世界'] as const;
// export const categories = ['閱讀隨筆', '歷史與文明', '旅遊隨筆', '台灣與世界', '廈門大稻埕陳氏'] as const;

export const categoryPaths: Record<(typeof categories)[number], string> = {
  '閱讀隨筆': '/reading/',
  '歷史與文明': '/history/',
  '旅遊隨筆': '/travel/',
  '台灣與世界': '/taiwan-world/',
  // '廈門大稻埕陳氏': '/chen-family/'
};

export function sortArticles(items: Article[]) {
  return [...items].sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
}

export function visibleArticles(items: Article[]) {
  return sortArticles(items.filter((item) => !item.data.draft));
}

export function getYear(article: Article) {
  return article.data.published.getFullYear().toString();
}

export function slugify(value: string) {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, '-'));
}

export function relatedArticles(current: Article, all: Article[], limit = 4) {
  const currentTags = new Set(current.data.tags);
  return all
    .filter((item) => item.id !== current.id && !item.data.draft)
    .map((item) => {
      const sharedTags = item.data.tags.filter((tag) => currentTags.has(tag)).length;
      const sameCategory = item.data.category === current.data.category ? 2 : 0;
      const sameBookAuthor = current.data.bookAuthor && item.data.bookAuthor === current.data.bookAuthor ? 3 : 0;
      return { item, score: sharedTags + sameCategory + sameBookAuthor };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.data.published.valueOf() - a.item.data.published.valueOf())
    .slice(0, limit)
    .map(({ item }) => item);
}

export const dateFormatter = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric', month: '2-digit', day: '2-digit'
});
