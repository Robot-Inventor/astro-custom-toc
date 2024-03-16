import type { AstroConfig, AstroIntegration } from "astro";
import { RemarkCustomTocOptions, remarkCustomToc } from "./remark-custom-toc.js";
import remarkComment from "remark-comment";

const checkOrder = (config: AstroConfig): void => {
    const customTocIndex = config.integrations.findIndex((integration) => integration.name === "astro-custom-toc");
    const mdxIndex = config.integrations.findIndex((integration) => integration.name === "@astrojs/mdx");
    // eslint-disable-next-line no-magic-numbers
    if (mdxIndex > -1 && customTocIndex > mdxIndex) {
        throw new Error(
            `
MDX integration configured before astro-custom-toc.
\`astroCustomToc()\` must be loaded before \`mdx()\`.
`.trim()
        );
    }
};

const astroCustomToc = (options?: RemarkCustomTocOptions): AstroIntegration => {
    const integration: AstroIntegration = {
        hooks: {
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
