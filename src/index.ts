import type { AstroConfig, AstroIntegration } from "astro";
import { type Comment, type RehypeCustomTocOptions, rehypeCustomToc } from "./rehype-custom-toc.js";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import remarkComment from "remark-comment";

/**
 * Check if the order of integrations is correct.
 * `customToc()` must be loaded before `mdx()`.
 * @param config Astro config
 */
const checkOrder = (config: AstroConfig): void => {
    const customTocIndex = config.integrations.findIndex((integration) => integration.name === "astro-custom-toc");
    const mdxIndex = config.integrations.findIndex((integration) => integration.name === "@astrojs/mdx");
    // eslint-disable-next-line no-magic-numbers
    if (mdxIndex > -1 && customTocIndex > mdxIndex) {
        throw new Error(
            `
MDX integration configured before astro-custom-toc.
\`customToc()\` must be loaded before \`mdx()\`.
`.trim()
        );
    }
};

/**
 * Create the astro-custom-toc integration.
 * @param options Options for the integration
 * @returns The AstroIntegration object
 */
const astroCustomToc = (options?: RehypeCustomTocOptions): AstroIntegration => {
    const integration: AstroIntegration = {
        hooks: {
            // eslint-disable-next-line jsdoc/require-jsdoc
            "astro:config:setup": ({ config, updateConfig }) => {
                checkOrder(config);
                updateConfig({
                    markdown: {
                        remarkPlugins: [
                            [
                                remarkComment,
                                {
                                    ast: true
                                }
                            ]
                        ],
                        remarkRehype: {
                            handlers: {
                                /**
                                 * Convert a mdast comment node to a hast comment node.
                                 * @param _ State
                                 * @param node mdast comment node
                                 * @returns hast comment node
                                 */
                                // eslint-disable-next-line id-length
                                comment: (_, node: Comment) => ({
                                    type: "comment",
                                    value: node.commentValue
                                })
                            }
                        },
                        // eslint-disable-next-line sort-keys
                        rehypePlugins: [rehypeHeadingIds, [rehypeCustomToc, options]]
                    }
                });
            }
        },
        name: "astro-custom-toc"
    };

    return integration;
};

export default astroCustomToc;
