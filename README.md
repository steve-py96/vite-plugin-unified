![GitHub package.json version](https://img.shields.io/github/package-json/v/steve-py96/vite-plugin-unified?style=flat-square&color=000000)

# vite-plugin-unified

Just a little [vite](https://github.com/vitejs/vite) plugin that works with [unified](https://github.com/unifiedjs/unified).

## playground

[Stackblitz example](https://stackblitz.com/edit/vite-plugin-unified)

## how to use

1. `npm install -D vite-plugin-unified` / `yarn add -D vite-plugin-unified` / `pnpm add -D vite-plugin-unified`
2. include it in your vite plugins

```typescript
// inside your vite.config.ts f.e.

export default defineConfig({
  plugins: [
    vitePluginUnified({
      // your config
    }),
  ],
});
```

For hot-reloading on your processed pages (if your output is HTML) you can include `rehypeVite` into your unified chain.
It injects the vite client in development mode automatically and provides further configurations (see section [rehypeVite](#rehypeVite)).
For context-based processings (like a dev setup which differs slightly from the prod build) you have also the vite-context within the `vite-plugin-unified` context.

## configuration

(just taken out of [src/types.ts](./src/types.ts)).

```typescript
type Config = Partial<{
  /** the directory for unified files (by default '/src/pages') */
  directory: string;

  /** the extensions to determinate what files to process (by default ['md']) */
  extensions: Array<string>;

  /** server settings */
  server: Partial<{
    /** enables caching on the dev server (by default true) */
    cache?: boolean;

    /** attach custom headers to the responses of your processed files */
    responseHeaders: OutgoingHttpHeaders;
  }>;

  /** build settings */
  build: Partial<{
    /** a glob to determinate all files to build (by default ./[directory]\/\*\*\/*.{[extensions]}) */
    glob?: string | Array<string>;

    /** the directory within dist where the builds will land (by default 'unified') */
    outDir?: string;

    /** the output format of the processing (by default 'html') */
    outFormat?: string | ((file: string) => string);
  }>;

  /** processing / transforming settings */
  transform: Partial<{
    /** the default transformer for all files without custom .unified.{js,ts} file (by default (content) => content) */
    defaultTransformer: Transform;

    /** the required export function of your custom .unified.{js,ts} files (by default 'transform') */
    exportName: string;
  }>;
}>;
```

## examples

### Markdown to HTML

```typescript
// within the vite plugins
vitePluginUnified({
  directory: '/src/pages',
  transform: {
    async defaultTransformer(content, context) {
      return await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(context.rehypeVite, {
          scripts: '/src/markdownEntry.ts',
        })
        .use(rehypeFormat)
        .use(rehypeStringify)
        .process(content);
    },
  },
});
```

## rehypeVite

`vite-plugin-unified` provides every transformer (custom or defaultTransformer) a context which contains the `rehypeVite`-Plugin for unified.
`rehypeVite` allows you to create the document or add scripts, styles and attributes (to html, head and body only) to an existing document.
You can additionally control when those scripts / styles should be included (like dev-only, prod-only) since the plugin is aware of the vite-context aswell.

### configuration

(just taken out of [src/types.ts](./src/plugins/types.ts)).

```typescript
export type { Options, Element, HChild };

type h = typeof import('hastscript').h;

type Element = ReturnType<h>;
type HChild = Parameters<h>[2];

type WithGeneral<T> = T &
  Partial<{
    _target: 'head' | 'body';
    _ignore: boolean;
    attributes?: Record<string, string>;
  }>;
type Script = WithGeneral<{ src: string }>;
type Style = WithGeneral<{ href: string }>;
type Inline = WithGeneral<{
  content: string;
}>;

type Options = Partial<{
  /** add attributes to html, head and/or body (f.e. lang on html) */
  attributes?: Partial<{
    /** add attributes on \<html\> */
    html: Record<string, string>;

    /** add attributes on \<head\> */
    head: Record<string, string>;

    /** add attributes on \<body\> */
    body: Record<string, string>;
  }>;

  /** add custom stuff to head (with hastscript), note: this only is used when there's no document existing yet! default here is the vscode emmet html head without title */
  customHead?: (hastscript: h) => HChild | Array<HChild>;

  /** add a custom title to the page, note: this only is used when there's no document existing yet and no customHead is used! default here is 'unified' */
  title?: string;

  /** add custom stuff to body (with hastscript), note: this only is used when there's no document existing yet! */
  customBody?: (hastscript: h) => HChild | Array<HChild>;

  /** a custom container around all elements within the body, note: customBody content also goes into this container! */
  container?: (hastscript: h) => Element;

  /** add an inline script (by default in head, if provided as object modifiable) */
  inlineScript: string | Inline;

  /** a script source / an array of script sources (by default async in head, if provided as object modifiable) */
  scripts: string | Script | Array<string | Script>;

  /** add an inline style (by default in head, if provided as object modifiable) */
  inlineStyle: string | Inline;

  /** a stylesheet href / an array of stylesheets hrefs (by default in head, if provided as object modifiable) */
  styles: string | Style | Array<string | Style>;
}>;
```

## upcoming

- more tests with vitest (each plugin yet missing)
- more configurations?
