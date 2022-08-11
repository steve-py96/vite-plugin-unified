import { defineConfig } from 'vitest/config';

// import { defineConfig } from 'vite';
// import { vitePluginUnified } from './src/index';
// import { unified } from 'unified';
// import remarkParse from 'remark-parse';
// import remarkRehype from 'remark-rehype';
// import rehypeFormat from 'rehype-format';
// import rehypeStringify from 'rehype-stringify';

// export default defineConfig(async () => {
//   return {
//     plugins: [
//       vitePluginUnified({
//         transform: {
//           async defaultTransformer(content, { plugins }) {
//             return await unified()
//               .use(remarkParse)
//               .use(remarkRehype)
//               .use(plugins.rehypeVite, {
//                 scripts: ['/src/someScript.js'],
//               })
//               .use(rehypeFormat)
//               .use(rehypeStringify)
//               .process(content);
//           },
//         },
//       }),
//     ],
//   };
// });
export default defineConfig(async () => ({
  test: {
    coverage: {
      enabled: !!process.env.CI,
    },
  },
}));
