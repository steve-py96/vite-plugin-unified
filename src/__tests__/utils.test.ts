import type { DeepRequired } from 'ts-essentials';
import type { Config } from '../types';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import {
  getCustomTransform,
  getFilePaths,
  globFromPrefix,
  log,
  pathInfo,
  prepareConfig,
  noopTransform,
} from '../utils';

const generateTestConfig = (): DeepRequired<Config> => ({
  directory: '/src/pages',
  extensions: ['md'],
  server: {
    cache: true,
    responseHeaders: {},
  },
  build: {
    glob: './src/pages/**/*.md',
    outDir: 'unified',
    outFormat: 'html',
  },
  transform: {
    defaultTransformer: noopTransform,
    exportName: 'transform',
  },
});

beforeAll(() => {
  vi.mock('node:fs/promises', () => {
    return {
      stat: async (path: string) => {
        if (path.includes('exists')) {
          if (
            (path.includes('_js') && !path.endsWith('.js')) ||
            (path.includes('_ts') && !path.endsWith('.ts'))
          )
            return Promise.reject();

          return {
            isDirectory: () => path.includes('dir'),
          };
        }

        return Promise.reject();
      },
    };
  });

  vi.mock('jiti', () => {
    return {
      default: (path: string, _config: Record<string, boolean>) => (_id: string) => {
        if (path.includes('withTransform'))
          return {
            [path.includes('custom') ? 'customTransform' : 'transform']: path.includes('string')
              ? ''
              : () => {},
          };

        return {};
      },
    };
  });
});

afterAll(() => {
  vi.resetAllMocks();
});

test('noopTransform does nothing with the content', async () => {
  expect(await noopTransform('test')).toBe('test');
  expect(await noopTransform('test123')).toBe('test123');
});

test('log functions log proper formats', () => {
  expect(log.info('test')).toBe('  ℹ️  | test');
  expect(log.warn('test')).toBe('  ⚠️  | test');
  expect(log.error('test')).toBe('  🛑  | test');
});

test('pathInfo gives proper results based on the node results', async () => {
  expect(await pathInfo('notexisting')).toMatchObject({
    exists: false,
    dir: false,
  });

  expect(await pathInfo('exists')).toMatchObject({
    exists: true,
    dir: false,
  });

  expect(await pathInfo('exists_dir')).toMatchObject({
    exists: true,
    dir: true,
  });
});

test('globFromPrefix makes relative glob paths', () => {
  expect(globFromPrefix('/src/pages', ['md'])).toBe('./src/pages/**/*.md');
  expect(globFromPrefix('src/pages', ['md'])).toBe('./src/pages/**/*.md');
});

test('globFromPrefix makes relative glob paths with multiple extensions', () => {
  expect(globFromPrefix('/src/pages', ['html', 'md'])).toBe('./src/pages/**/*.{html,md}');
  expect(globFromPrefix('src/pages', ['html', 'md'])).toBe('./src/pages/**/*.{html,md}');
});

test('getCustomTransform returns proper results for each possible scenario with .unified.js files', async () => {
  // unified file doesnt exist
  expect(await getCustomTransform('notexisting.js', 'transform')).toBe(null);
  // unified file does not have an export / not a proper export (in this case none)
  expect(await getCustomTransform('exists_js.js', 'transform')).toBe(
    'exists_js.unified.js does not export a transform function!'
  );
  // unified file does not have an export / not a proper export (in this case not a proper one due to custom naming while the export is the default one)
  expect(await getCustomTransform('exists_js_withTransform.js', 'customTransform')).toBe(
    'exists_js_withTransform.unified.js does not export a transform function!'
  );
  // unified file does not have a transform-function (but anything else)
  expect(await getCustomTransform('exists_js_withTransform_string.js', 'transform')).toBe(
    'exists_js_withTransform_string.unified.js exports a transform which is not a function!'
  );
  // unified file does not have a transform-function (but anything else, with custom transform name)
  expect(
    await getCustomTransform('exists_js_withTransform_custom_string.js', 'customTransform')
  ).toBe(
    'exists_js_withTransform_custom_string.unified.js exports a transform which is not a function!'
  );
  // unified file is fine
  expect(await getCustomTransform('exists_js_withTransform.js', 'transform')).toBeInstanceOf(
    Function
  );
  // unified file is fine (custom transform name)
  expect(
    await getCustomTransform('exists_js_withTransform_custom.js', 'customTransform')
  ).toBeInstanceOf(Function);
});

test('getCustomTransform returns proper results for each possible scenario with .unified.ts files', async () => {
  // unified file doesnt exist
  expect(await getCustomTransform('notexisting.ts', 'transform')).toBe(null);
  // unified file does not have an export / not a proper export (in this case none)
  expect(await getCustomTransform('exists_ts.ts', 'transform')).toBe(
    'exists_ts.unified.ts does not export a transform function!'
  );
  // unified file does not have an export / not a proper export (in this case not a proper one due to custom naming while the export is the default one)
  expect(await getCustomTransform('exists_ts_withTransform.ts', 'customTransform')).toBe(
    'exists_ts_withTransform.unified.ts does not export a transform function!'
  );
  // unified file does not have a transform-function (but anything else)
  expect(await getCustomTransform('exists_ts_withTransform_string.ts', 'transform')).toBe(
    'exists_ts_withTransform_string.unified.ts exports a transform which is not a function!'
  );
  // unified file does not have a transform-function (but anything else, with custom transform name)
  expect(
    await getCustomTransform('exists_ts_withTransform_custom_string.ts', 'customTransform')
  ).toBe(
    'exists_ts_withTransform_custom_string.unified.ts exports a transform which is not a function!'
  );
  // unified file is fine
  expect(await getCustomTransform('exists_ts_withTransform.ts', 'transform')).toBeInstanceOf(
    Function
  );
  // unified file is fine (custom transform name)
  expect(
    await getCustomTransform('exists_ts_withTransform_custom.ts', 'customTransform')
  ).toBeInstanceOf(Function);
});

test.todo('getFilePaths returns proper files', async () => {
  // expect(getFilePaths({}, {})).toBeTruthy();
});

test('prepareConfig creates (proper) defaults for everything without setting stuff', () => {
  const tmp = generateTestConfig();
  expect(prepareConfig()).toMatchObject(tmp);
  expect(prepareConfig({})).toMatchObject(tmp);
  expect(
    prepareConfig({
      build: {},
    })
  ).toMatchObject(tmp);
  expect(
    prepareConfig({
      server: {},
    })
  ).toMatchObject(tmp);
  expect(
    prepareConfig({
      transform: {},
    })
  ).toMatchObject(tmp);
});

test('prepareConfig creates (proper) defaults when setting directory', () => {
  const tmp = generateTestConfig();
  tmp.directory = '/custom/path';
  tmp.build.glob = './custom/path/**/*.md'; // dependency on directory
  expect(
    prepareConfig({
      directory: '/custom/path',
    })
  ).toMatchObject(tmp);
  expect(
    prepareConfig({
      directory: 'custom/path', // no leading slash
    })
  ).toMatchObject(tmp);
});

test('prepareConfig creates (proper) defaults when setting extensions', () => {
  // one extension
  let tmp = generateTestConfig();
  tmp.extensions = ['html'];
  tmp.build.glob = './src/pages/**/*.html'; // dependency on extensions
  expect(
    prepareConfig({
      extensions: ['html'],
    })
  ).toMatchObject(tmp);

  // multiple extensions
  tmp = generateTestConfig();
  tmp.extensions = ['html', 'md'];
  tmp.build.glob = './src/pages/**/*.{html,md}'; // dependency on extensions
  expect(
    prepareConfig({
      extensions: ['html', 'md'],
    })
  ).toMatchObject(tmp);
});

test('prepareConfig creates (proper) defaults when setting server.*', () => {
  // server.cache
  let tmp = generateTestConfig();
  tmp.server.cache = false;
  expect(
    prepareConfig({
      server: {
        cache: false,
      },
    })
  ).toMatchObject(tmp);

  // server.responseHeaders
  tmp = generateTestConfig();
  tmp.server.responseHeaders = {
    test: 123,
  };
  expect(
    prepareConfig({
      server: {
        responseHeaders: {
          test: 123,
        },
      },
    })
  ).toMatchObject(tmp);

  // all of server
  tmp = generateTestConfig();
  tmp.server.cache = false;
  tmp.server.responseHeaders = {
    test: 123,
  };
  expect(
    prepareConfig({
      server: {
        cache: false,
        responseHeaders: {
          test: 123,
        },
      },
    })
  ).toMatchObject(tmp);
});

test('prepareConfig creates (proper) defaults when setting build.*', () => {
  // build.glob
  let tmp = generateTestConfig();
  tmp.build.glob = './test/pages/**/*.*';
  expect(
    prepareConfig({
      build: {
        glob: './test/pages/**/*.*',
      },
    })
  ).toMatchObject(tmp);

  // build.glob (as array)
  tmp.build.glob = ['./test/pages/**/*.*', '!./test/pages/ignore'];
  expect(
    prepareConfig({
      build: {
        glob: ['./test/pages/**/*.*', '!./test/pages/ignore'],
      },
    })
  ).toMatchObject(tmp);

  // build.outDir
  tmp = generateTestConfig();
  tmp.build.outDir = 'custom';
  expect(
    prepareConfig({
      build: {
        outDir: 'custom',
      },
    })
  ).toMatchObject(tmp);

  // build.outFormat
  tmp = generateTestConfig();
  tmp.build.outFormat = 'js';
  expect(
    prepareConfig({
      build: {
        outFormat: 'js',
      },
    })
  );

  // build.outFormat (as function)
  tmp.build.outFormat = (file) => file + 'js';
  expect(
    prepareConfig({
      build: {
        outFormat: tmp.build.outFormat,
      },
    })
  );

  // all of build
  tmp = generateTestConfig();
  tmp.build.glob = './test/pages/**/*.*';
  tmp.build.outDir = 'custom';
  tmp.build.outFormat = 'js';
  expect(
    prepareConfig({
      build: {
        glob: './test/pages/**/*.*',
        outDir: 'custom',
        outFormat: 'js',
      },
    })
  ).toMatchObject(tmp);
});

test('prepareConfig creates (proper) defaults when setting transform.*', () => {
  // transform.defaultTransformer
  let tmp = generateTestConfig();
  tmp.transform.defaultTransformer = (content) => content + '1';
  expect(
    prepareConfig({
      transform: {
        defaultTransformer: tmp.transform.defaultTransformer,
      },
    })
  ).toMatchObject(tmp);

  // transform.exportName
  tmp = generateTestConfig();
  tmp.transform.exportName = 'customTransform';
  expect(
    prepareConfig({
      transform: {
        exportName: 'customTransform',
      },
    })
  ).toMatchObject(tmp);

  // all of transform
  tmp = generateTestConfig();
  tmp.transform.defaultTransformer = (content) => content + '1';
  tmp.transform.exportName = 'customTransform';
  expect(
    prepareConfig({
      transform: {
        defaultTransformer: tmp.transform.defaultTransformer,
        exportName: 'customTransform',
      },
    })
  ).toMatchObject(tmp);
});

test('prepareConfig does not overwrite anything if all is set', () => {
  const tmp = generateTestConfig();

  // *
  tmp.directory = '/test/pages';
  tmp.extensions = ['html', 'md'];

  // server.*
  tmp.server.cache = false;
  tmp.server.responseHeaders = {
    test: 123,
  };

  // build.*
  tmp.build.glob = './test-glob/pages/**/*.*';
  tmp.build.outDir = 'custom';
  tmp.build.outFormat = 'js';

  // transform.*
  tmp.transform.defaultTransformer = (content) => content + '1';
  tmp.transform.exportName = 'customTransform';

  expect(prepareConfig(tmp)).toMatchObject(tmp);
});
