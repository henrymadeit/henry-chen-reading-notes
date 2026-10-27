import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { dev } from 'astro';

const articles = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/articles'
  }),

  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),

    category: z.enum([
      '閱讀隨筆',
      '歷史與文明',
      '行旅與隨想',
      '台灣與世界',
      '廈門大稻埕陳氏'
    ]),

    author: z.string().default('Henry Chen'),
    bookAuthor: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.number().int().nonnegative().default(0),
    pinned: z.number().int().nonnegative().default(0),
    draft: z.boolean().default(false),
    readingNumber: z.number().int().positive().optional(),
    note: z.string().optional(),
    takeaway: z.string().optional(),
    message: z.string().optional(),
    cover: z.string().optional(),
    coverCaption: z.string().optional(),

    // 指定延伸閱讀文章的網址代碼
    extendedReading: z.array(z.string()).default([])
  })
});

export const collections = { articles };