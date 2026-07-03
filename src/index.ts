import {
    type Comment,
    type RehypeCustomTocOptions,
    type RehypeCustomTocTemplate,
    rehypeCustomToc
} from "./rehype-custom-toc.js";
import { isUnifiedProcessor, rehypeHeadingIds } from "@astrojs/markdown-remark";
import type { AstroIntegration } from "astro";
import { createSatteriTocPlugins } from "./satteri-custom-toc.js";
import { isSatteriProcessor } from "@astrojs/markdown-satteri";
import remarkComment from "remark-comment";

declare module "mdast" {
    // Add the `Comment` node to the list of nodes.
    interface RootContentMap {
        comment: Comment;
    }

    interface Data {
        id: string;
    }
}

/**
 * Create the astro-custom-toc integration.
 * @param options Options for the integration
 * @returns The AstroIntegration object
 */
const astroCustomToc = (options?: RehypeCustomTocOptions): AstroIntegration => ({
    hooks: {
        // eslint-disable-next-line jsdoc/require-jsdoc
        "astro:config:setup": ({ config, logger }): void => {
            const { processor } = config.markdown;

            if (isUnifiedProcessor(processor)) {
                processor.options.remarkPlugins.push([remarkComment, { ast: true }]);
                processor.options.rehypePlugins.push(rehypeHeadingIds, [rehypeCustomToc, options]);

                const { remarkRehype: remarkRehypeOptions } = processor.options;
                const existingHandlers = remarkRehypeOptions["handlers"] ?? {};
                remarkRehypeOptions["handlers"] = {
                    ...existingHandlers,
                    /**
                     * Convert a mdast comment node to a hast comment node.
                     * @param _state remark-rehype state
                     * @param node mdast comment node
                     * @returns hast comment node
                     */
                    comment: (_state: unknown, node: Comment): { type: "comment"; value: string } => ({
                        type: "comment",
                        value: node.commentValue
                    })
                };
            } else if (isSatteriProcessor(processor)) {
                processor.options.hastPlugins.push(...createSatteriTocPlugins(options));
            } else {
                logger.warn(
                    "astro-custom-toc only supports the `unified` and `sätteri` Markdown processors. " +
                        "Set `markdown.processor: unified()` from `@astrojs/markdown-remark` or " +
                        "`markdown.processor: satteri()` from `@astrojs/markdown-satteri` to enable it."
                );
            }
        }
    },
    name: "astro-custom-toc"
});

export default astroCustomToc;
export type { RehypeCustomTocOptions, RehypeCustomTocTemplate };
