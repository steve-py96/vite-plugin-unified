import type { Plugin, ResolvedConfig } from 'vite';
import type { Config, Transform, TransformContext, VFile } from './types.js';
import type { DeepRequired } from 'ts-essentials';
import { basename, join, relative } from 'node:path';
import { parse as qs } from 'node:querystring';
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { pathInfo, log, getCustomTransform, getFilePaths, prepareConfig } from './utils.js';
import { PLUGIN_CACHE_HEADER } from './consts.js';
import { rehypeVite } from './plugins/rehype-vite.js';

export type { Config as VitePluginUnifiedConfig, Transform, TransformContext };
export { vitePluginUnified };

const vitePluginUnified = (config?: Config): Plugin => {
  const cache = new Map<string, unknown>();
  const CONFIG: DeepRequired<Config> = prepareConfig(config);
  let VITE_CONFIG = {} as ResolvedConfig;
  let transformContext = {} as TransformContext;
  let totalFilesWritten = 0;

  return {
    name: 'vite-plugin-unified',
    enforce: 'pre',
    async configResolved(config) {
      Object.assign(VITE_CONFIG, config);

      transformContext = {
        command: config.command,
        mode: config.mode,
        file: '',
        plugins: { rehypeVite: rehypeVite(VITE_CONFIG) },
      };

      if (config.command === 'build') {
        VITE_CONFIG.build.rollupOptions.input = VITE_CONFIG.build.rollupOptions.input || {};

        const ref = VITE_CONFIG.build.rollupOptions.input as Record<string, string>;

        if (Object.keys(ref).length === 0) ref.main = join(process.cwd(), 'index.html');

        (await getFilePaths(CONFIG, VITE_CONFIG)).forEach(({ input, output }) => {
          ref[`vite-plugin-unified__${input}`] = join(process.cwd(), output);
        });
      }
    },
    configureServer({ middlewares }) {
      middlewares.use(CONFIG.directory, async (request, response, next) => {
        if (!request.originalUrl || !request.originalUrl.startsWith(CONFIG.directory))
          return next();

        // url & querystring parsing
        const [url, rawUrlQuery] = request.originalUrl.split('?');
        const query = qs(rawUrlQuery);

        if (!CONFIG.extensions.some((ext) => url!.endsWith(ext))) return next();

        // query param options
        const mayCache = CONFIG.server.cache && !('vite-plugin-unified-nocache' in query);

        if (cache.has(url) && mayCache) {
          return response
            .writeHead(200, {
              [PLUGIN_CACHE_HEADER]: 'hit',
            })
            .end(cache.get(url));
        }

        const filePath = join(VITE_CONFIG.root, url);
        const fileInfo = await pathInfo(filePath);

        if (!fileInfo.exists || fileInfo.dir) return response.writeHead(404).end();

        const customTransform = await getCustomTransform(filePath, CONFIG.transform.exportName);
        let content: unknown = await readFile(filePath, { encoding: 'utf-8' });

        if (typeof customTransform === 'string') {
          VITE_CONFIG.logger.error(log.error(customTransform));
          return response.writeHead(501).end(customTransform);
        }

        if (customTransform === null)
          content = await CONFIG.transform.defaultTransformer(content as string, {
            ...transformContext,
            file: relative(VITE_CONFIG.root, filePath),
          });
        else
          content = await customTransform(content as string, {
            ...transformContext,
            file: relative(VITE_CONFIG.root, filePath),
          });

        if (typeof content !== 'string') {
          if ('value' in (content as VFile)) content = (content as VFile).value;
          else {
            const errorMessage = `${url} was resolved invalidly, expected VFile or string, got anything else (${(
              content as { toString(): string }
            ).toString()})`;

            VITE_CONFIG.logger.error(log.error(errorMessage));
            return response.writeHead(500).end(errorMessage);
          }
        }

        if (mayCache) cache.set(url, content);

        response
          .writeHead(200, {
            [PLUGIN_CACHE_HEADER]: 'miss',
            ...CONFIG.server.responseHeaders,
          })
          .end(content);
      });
    },
    handleHotUpdate({ file: filePath, server }) {
      const file = `/${relative(VITE_CONFIG.root, filePath)}`;

      if (file.startsWith(CONFIG.directory)) {
        if (file.endsWith('.unified.js') || file.endsWith('.unified.ts')) {
          const fileNameWithoutUnified = file.slice(0, -'.unified.ts'.length);
          const base = basename(fileNameWithoutUnified);

          for (const [key] of cache.entries()) {
            if (key.startsWith(fileNameWithoutUnified) && basename(key).startsWith(base)) {
              cache.delete(key);
              break; // there can only be one possible match
            }
          }
        } else cache.delete(file);

        server.ws.send({
          type: 'full-reload',
        });
      }
    },
    async buildStart() {
      if (VITE_CONFIG.command !== 'build') return;

      const paths = await getFilePaths(CONFIG, VITE_CONFIG);
      const outDir = CONFIG.build.outDir;
      const baseFolder = join(
        VITE_CONFIG.build.outDir,
        outDir.startsWith(VITE_CONFIG.build.outDir)
          ? relative(VITE_CONFIG.build.outDir, outDir)
          : outDir
      );

      await mkdir(baseFolder, { recursive: true });

      await Promise.all(
        paths.map(async ({ input, output }) => {
          const customTransform = await getCustomTransform(input, CONFIG.transform.exportName);
          let content: unknown = await readFile(input, { encoding: 'utf-8' });

          if (typeof customTransform === 'string') throw new Error(customTransform);

          if (customTransform === null)
            content = await CONFIG.transform.defaultTransformer(content as string, {
              ...transformContext,
              file: relative(VITE_CONFIG.root, input),
            });
          else
            content = await customTransform(content as string, {
              ...transformContext,
              file: relative(VITE_CONFIG.root, input),
            });

          if (typeof content !== 'string') {
            if ('value' in (content as VFile)) content = (content as VFile).value;
            else {
              const errorMessage = `${input} was resolved invalidly, expected VFile or string, got anything else (${(
                content as { toString(): string }
              ).toString()})`;

              throw new Error(errorMessage);
            }
          }

          await mkdir(join(process.cwd(), output.slice(0, -basename(output).length)), {
            recursive: true,
          });
          return writeFile(join(process.cwd(), output), content as string, { encoding: 'utf-8' });
        })
      );

      totalFilesWritten = paths.length;
    },
    async writeBundle() {
      if (totalFilesWritten === 0) return;

      const dist = join(process.cwd(), VITE_CONFIG.build.outDir);
      const nestedDist = join(dist, VITE_CONFIG.build.outDir);

      await cp(nestedDist, dist, { recursive: true });
      await rm(nestedDist, { recursive: true });
    },
  };
};
