import type { AstroConfig, AstroIntegration } from "astro";
import { remarkCustomToc, RemarkCustomTocOptions } from "./remark-custom-toc.js";
import remarkComment from "remark-comment";

const astroCustomToc = (options?: RemarkCustomTocOptions) => {
    const integration: AstroIntegration = {
        name: "astro-custom-toc",
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
        }
    };

    return integration;
};

const checkOrder = (config: AstroConfig) => {
    const customTocIndex = config.integrations.findIndex((i) => i.name === "astro-custom-toc");
    const mdxIndex = config.integrations.findIndex((i) => i.name === "@astrojs/mdx");
    if (mdxIndex > -1 && customTocIndex > mdxIndex) {
        throw new Error(
            `
MDX integration configured before astro-custom-toc.
\`astroCustomToc()\` must be loaded before \`mdx()\`.
`.trim()
        );
    }
};

export default astroCustomToc;
