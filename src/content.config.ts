import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(['閱讀隨筆', '歷史與文明', '科技', '廈門大稻埕陳氏']),
    author: z.string().default('Henry Chen'),
    bookAuthor: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    readingNumber: z.number().int().positive().optional(),
    cover: z.string().optional(),
    takeaway: z.string().optional()
  })
});

export const collections = { articles };
