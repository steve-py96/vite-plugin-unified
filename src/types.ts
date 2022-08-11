import type { ResolvedConfig } from 'vite';
import type { OutgoingHttpHeaders } from 'http';
import type { VFileWithOutput } from 'unified';

export type { Config, Transform, TransformContext, VFile };

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

type TransformContext = Pick<ResolvedConfig, 'mode' | 'command'> & {
  file: string;
  plugins: {
    rehypeVite: ReturnType<typeof import('./plugins/rehype-vite.js').rehypeVite>;
  };
};
type VFile = VFileWithOutput<unknown>;

type Transform = (
  content: string,
  context: TransformContext
) => string | VFile | Promise<string | VFile>;
