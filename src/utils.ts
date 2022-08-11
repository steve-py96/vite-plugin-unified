import type { DeepRequired } from 'ts-essentials';
import type { Config, Transform } from './types.js';
import type { ResolvedConfig } from 'vite';
import glob from 'fast-glob';
import { default as jiti } from 'jiti';
import { stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

export {
  pathInfo,
  log,
  globFromPrefix,
  getCustomTransform,
  getFilePaths,
  prepareConfig,
  noopTransform,
};

const noopTransform = async (content: string) => content;

const setupLog = (prefix: string) => (message: string) => `  ${prefix}  | ${message}`;
const log = {
  info: setupLog('ℹ️'),
  warn: setupLog('⚠️'),
  error: setupLog('🛑'),
};

const pathInfo = async (path: string) =>
  await stat(path)
    .then((result) => ({
      exists: true,
      dir: result.isDirectory(),
    }))
    .catch(() => ({
      exists: false,
      dir: false,
    }));

const globFromPrefix = (prefix: string, extensions: Array<string>) => {
  let re = prefix;

  if (re[0] === '/') re = `.${re}`;
  else if (re[0] !== '.') re = `./${re}`;
  if (re.endsWith('/')) re = re.slice(0, -1);

  return `${re}/**/*.${extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`}`;
};

const getCustomTransform = async (filePath: string, exportName: string) => {
  const fileExt = extname(filePath);
  const customUnifiedPath = `${filePath.slice(0, -fileExt.length)}.unified`;
  const unifiedInfoJS = await pathInfo(`${customUnifiedPath}.js`);
  const unifiedInfoTS = await pathInfo(`${customUnifiedPath}.ts`);

  if ((!unifiedInfoJS.exists || unifiedInfoJS.dir) && (!unifiedInfoTS.exists || unifiedInfoTS.dir))
    return null;
  else {
    const customTransformPath = `${customUnifiedPath}.${unifiedInfoTS.exists ? 'ts' : 'js'}`;

    const exports = jiti(customTransformPath, {
      cache: false,
      requireCache: false,
    })(customTransformPath);

    let errorMessage = '';

    if (!(exportName in exports))
      errorMessage = `${customTransformPath} does not export a transform function!`;
    else if (typeof exports[exportName] !== 'function')
      errorMessage = `${customTransformPath} exports a transform which is not a function!`;

    if (errorMessage) return errorMessage;

    return exports[exportName] as Transform;
  }
};

const getFilePaths = async (config: DeepRequired<Config>, vite_config: ResolvedConfig) => {
  const files = (await glob(config.build.glob)).map((file) => relative(vite_config.root, file));
  const paths = await Promise.all(
    files.map(async (filePath) => {
      const outDir = config.build.outDir;
      const fileExtension = extname(filePath);
      const outFile = filePath.slice(config.directory.length);
      const baseFolder = join(
        vite_config.build.outDir,
        outDir.startsWith(vite_config.build.outDir)
          ? relative(vite_config.build.outDir, outDir)
          : outDir
      );

      let newExtension =
        typeof config.build.outFormat === 'string'
          ? config.build.outFormat
          : config.build.outFormat(filePath);

      if (!newExtension.startsWith('.')) newExtension = `.${newExtension}`;

      return join(baseFolder, outFile.replace(fileExtension, newExtension));
    })
  );

  return files.map((file, index) => ({ input: file, output: paths[index] }));
};

const prepareConfig = (config?: Config) => {
  const re: DeepRequired<Config> = {
    directory: config?.directory || '/src/pages',
    extensions: config?.extensions || ['md'],
    server: {
      cache: !(config?.server?.cache === false),
      responseHeaders: config?.server?.responseHeaders || {},
    },
    build: {
      glob:
        config?.build?.glob ||
        globFromPrefix(config?.directory || '/src/pages', config?.extensions || ['md']),
      outDir: config?.build?.outDir || 'unified',
      outFormat: config?.build?.outFormat || 'html',
    },
    transform: {
      defaultTransformer: config?.transform?.defaultTransformer || noopTransform,
      exportName: config?.transform?.exportName || 'transform',
    },
  };

  if (!re.directory.startsWith('/')) re.directory = `/${re.directory}`;

  return re;
};
