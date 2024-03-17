import type { AstroConfig, AstroIntegration } from "astro";
import { RemarkCustomTocOptions, remarkCustomToc } from "./remark-custom-toc.js";
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
const astroCustomToc = (options?: RemarkCustomTocOptions): AstroIntegration => {
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
                            ],
                            [remarkCustomToc, options]
                        ]
                    }
                });
            }
        },
        name: "astro-custom-toc"
    };

    return integration;
};

export default astroCustomToc;
