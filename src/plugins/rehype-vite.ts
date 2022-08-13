import type { ResolvedConfig } from 'vite';
import type { Plugin } from 'unified';
import type { Parent, Node } from 'unist';
import type { Options, Element, HChild } from './types.js';
import { h } from 'hastscript';

export { rehypeVite };

const { assign } = Object;

const rehypeVite =
  (resolvedConfig: ResolvedConfig): Plugin<[Options?], Parent> =>
  (options) => {
    return (rootNode) => {
      rootNode.children = rootNode.children || [];

      const isDocument = rootNode.children.length > 0 && rootNode.children[0].type === 'doctype';
      let html: Element = null as unknown as Element;
      let head: Element = null as unknown as Element;
      let body: Element = null as unknown as Element;

      // css preprocessors are injected via module script in vite, so any style without css is judged to be one
      const handleStyle = (href: string, target: Element, attributes?: Record<string, string>) => {
        if (!href.endsWith('.css')) {
          if (attributes) {
            const { href, rel, ...leftAttributes } = attributes;

            leftAttributes.src = href;
            leftAttributes.type = 'module';

            target.children.push(h('script', leftAttributes), {
              type: 'text',
              value: '\n',
            });
          } else
            target.children.push(h('script', { src: href }), {
              type: 'text',
              value: '\n',
            });
        } else
          target.children.push(h('style', attributes || { rel: 'stylesheet', href }), {
            type: 'text',
            value: '\n',
          });
      };

      if (isDocument) {
        const tmpHtml = rootNode.children.find(
          (item) => item.type === 'element' && (item as Element).tagName === 'html'
        );

        if (!tmpHtml) return resolvedConfig.logger.error('no <html> found in document');

        html = tmpHtml as Element;

        const tmpHead = html.children.find(
          (item) => item.type === 'element' && item.tagName === 'head'
        );
        const tmpBody = html.children.find(
          (item) => item.type === 'element' && item.tagName === 'body'
        );

        if (!tmpHead) return resolvedConfig.logger.error('no <head> found in document');
        if (!tmpBody) return resolvedConfig.logger.error('no <body> found in document');

        head = tmpHead as Element;
        body = tmpBody as Element;
      } else {
        // prepare document if config exists
        head = h(
          'head',
          ...(options?.customHead
            ? [options?.customHead?.(h)].flat()
            : ([
                { type: 'text', value: '\n' },
                h('meta', { charset: 'UTF-8' }),
                { type: 'text', value: '\n' },
                h('meta', { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' }),
                { type: 'text', value: '\n' },
                h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
                { type: 'text', value: '\n' },
                h('title', options?.title || 'unified'),
                { type: 'text', value: '\n' },
              ] as unknown as Array<HChild>))
        );
        body = h(
          'body',
          ...(options?.customBody ? [options?.customBody?.(h)].flat() : []),
          { type: 'text', value: '\n' },
          ...(rootNode.children as unknown as Array<Element>)
        );
        html = h('html', { type: 'text', value: '\n' }, head, { type: 'text', value: '\n' }, body, {
          type: 'text',
          value: '\n',
        });

        if (options?.container) {
          const container = options.container(h);
          container.children = body.children;
          body.children = [container];
        }

        rootNode.children = [
          { type: 'doctype' },
          { type: 'text', value: '\n' } as Node,
          html,
          { type: 'text', value: '\n' } as Node,
        ];
      }

      // inject attributes, styles and scripts
      if (options) {
        /*
         * attributes
         */
        html.properties = html.properties || {};
        head.properties = head.properties || {};
        body.properties = body.properties || {};

        assign(html.properties!, options.attributes?.html);
        assign(head.properties!, options.attributes?.head);
        assign(body.properties!, options.attributes?.body);

        /*
         * external styles
         */
        if (typeof options.styles === 'string') handleStyle(options.styles, head);
        else if (typeof options.styles === 'object') {
          if (Array.isArray(options.styles)) {
            options.styles.forEach((item) => {
              if (typeof item === 'string') handleStyle(item, head);
              else if (item._ignore !== undefined ? !item._ignore : true) {
                let { _target: target, href, attributes } = item;
                const parent = target === 'body' ? body : head;

                attributes = attributes || {};
                attributes.rel = 'stylesheet';
                attributes.href = href;

                handleStyle(href, parent, attributes);
              }
            });
          } else if (options.styles._ignore !== undefined ? !options.styles._ignore : true) {
            let { _target: target, href, attributes } = options.styles;
            const parent = target === 'body' ? body : head;

            attributes = attributes || {};
            attributes.rel = 'stylesheet';
            attributes.href = href;

            handleStyle(href, parent, attributes);
          }
        }

        /*
         * external scripts
         */
        if (typeof options.scripts === 'string')
          head.children.push(h('script', { type: 'module', src: options.scripts }), {
            type: 'text',
            value: '\n',
          });
        else if (typeof options.scripts === 'object') {
          if (Array.isArray(options.scripts)) {
            options.scripts.forEach((item) => {
              if (typeof item === 'string')
                head.children.push(h('script', { type: 'module', src: item, async: true }), {
                  type: 'text',
                  value: '\n',
                });
              else if (item._ignore !== undefined ? item._ignore : true) {
                let { _target: target, src, attributes } = item;
                const parent = target === 'body' ? body : head;

                attributes = attributes || {};
                attributes.src = src;
                parent.children.push(h('script', attributes), { type: 'text', value: '\n' });
              }
            });
          } else if (options.scripts._ignore !== undefined ? !options.scripts._ignore : true) {
            let { _target: target, src, attributes } = options.scripts;
            const parent = target === 'body' ? body : head;

            attributes = attributes || {};
            attributes.src = src;
            parent.children.push(h('script', attributes), { type: 'text', value: '\n' });
          }
        }

        /*
         * inline style
         */
        if (typeof options.inlineStyle === 'string')
          head.children.push(h('style', options.inlineStyle), { type: 'text', value: '\n' });
        else if (
          typeof options.inlineStyle === 'object' &&
          (options.inlineStyle._ignore !== undefined ? options.inlineStyle._ignore : true)
        ) {
          const { _target: target, content, attributes } = options.inlineStyle;
          const parent = target === 'body' ? body : head;

          parent.children.push(h('style', attributes, content), { type: 'text', value: '\n' });
        }

        /*
         * inline script
         */
        if (typeof options.inlineScript === 'string')
          head.children.push(h('script', { type: 'module', async: true }, options.inlineScript), {
            type: 'text',
            value: '\n',
          });
        else if (
          typeof options.inlineScript === 'object' &&
          (options.inlineScript._ignore !== undefined ? !options.inlineScript._ignore : true)
        ) {
          const { _target: target, content, attributes } = options.inlineScript;
          const parent = target === 'body' ? body : head;

          parent.children.push(h('script', attributes, content), { type: 'text', value: '\n' });
        }
      }

      // inject the vite client in serve mode
      if (resolvedConfig.command === 'serve')
        head.children.unshift(
          { type: 'text', value: '\n' },
          h('script', { type: 'module', id: '__rehypeVite__vite_client__', src: '/@vite/client' })
        );
    };
  };
