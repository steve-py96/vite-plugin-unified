export type { Options, Element, HChild };

type h = typeof import('hastscript').h;

type Element = ReturnType<h>;
type HChild = Parameters<h>[2];

type WithGeneral<T> = T &
  Partial<{
    /** the target tag to render the script / style into */
    _target: 'head' | 'body';

    /** true if the script / style should not be rendered (useful in combination with context.command f.e.) */
    _ignore: boolean;

    /** attributes for the script / style, note: src / href will be used no matter if they're defined here again or differently */
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
