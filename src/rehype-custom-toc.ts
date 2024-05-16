import type { Element, Root, RootContent } from "hast";
import type { Plugin, Transformer } from "unified";
import type { MarkdownHeading } from "@astrojs/markdown-remark";
import { fromHtml } from "hast-util-from-html";
import { h } from "hastscript";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";

/**
 * A comment node generated by the `remark-comment` plugin.
 */
export interface Comment extends Node {
    type: "comment";
    value: "";
    commentValue: string;
}

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
 * Custom TOC template function.
 * @param html HTML content of the TOC list
 * @returns Wrapped HTML content
 */
export type RehypeCustomTocTemplate = (html: string) => string;

/**
 * Options for the rehypeCustomToc plugin.
 */
export interface RehypeCustomTocOptions {
    /**
     * A function that takes the generated HTML and returns the final HTML.
     * This can be used to wrap the generated HTML in a custom template.
     * @default
     * ```javascript
     * const defaultTemplate = (html) => {
     *     return `
     * <aside class="toc">
     *     <h2>Contents</h2>
     *     <nav>
     *         ${html}
     *     </nav>
     * </aside>`.trim();
     * };
     * ```
     */
    template?: RehypeCustomTocTemplate;
    /**
     * The maximum depth of headings to include in the table of contents.
     * @default 3
     */
    maxDepth?: number;
    /**
     * Whether to use an ordered list (`<ol>`) or an unordered list (`<ul>`).
     * @default false
     */
    ordered?: boolean;
}

declare module "vfile" {
    interface DataMap {
        astro?: {
            frontmatter: Record<string, unknown>;
        };
        __astroHeadings: MarkdownHeading[];
    }
}

/**
 * Default TOC template function for {@link RehypeCustomTocTemplate}.
 * @param html HTML content of the TOC list
 * @returns Wrapped HTML content
 */
const defaultTemplate: RehypeCustomTocTemplate = (html: string): string =>
    `
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        ${html}
    </nav>
</aside>`.trim();

/**
 * Default options for the rehypeCustomToc plugin.
 */
const DEFAULT_OPTIONS = {
    maxDepth: 3,
    ordered: false,
    template: defaultTemplate
} as const satisfies Required<RehypeCustomTocOptions>;

/**
 * Generate the table of contents from the headings data.
 * @param options Options for the plugin
 * @param headings Headings data
 * @returns The generated table of contents
 */
// eslint-disable-next-line max-statements
const generateToc = (options: Required<RehypeCustomTocOptions>, headings: MarkdownHeading[]): RootContent[] => {
    const toc: Element = {
        children: [],
        properties: {},
        tagName: options.ordered ? "ol" : "ul",
        type: "element"
    } as const;

    let currentDepth = headings[0].depth;
    let currentParent = toc;
    const parents: Element[] = [toc];

    for (const heading of headings) {
        // eslint-disable-next-line no-continue
        if (heading.depth > options.maxDepth) continue;

        const li = h("li", h("a", { href: `#${heading.slug}` }, heading.text));

        if (heading.depth === currentDepth) {
            // The current heading is at the same level as the previous one.
            currentParent.children.push(li);
            currentDepth = heading.depth;
        } else if (heading.depth > currentDepth) {
            // The current heading is at a deeper level than the previous one.
            const ul = h(options.ordered ? "ol" : "ul", li);
            currentParent.children.push(ul);

            currentParent = ul;
            parents.push(currentParent);
            currentDepth = heading.depth;
        } else {
            // The current heading is at a shallower level than the previous one.
            // eslint-disable-next-line id-length
            for (let i = 0; i < currentDepth - heading.depth; i++) {
                const parentNode = parents.pop();
                if (!parentNode) throw new Error("Parent node not found. Make sure the headings are sorted by depth.");
                // eslint-disable-next-line no-magic-numbers
                currentParent = parents[parents.length - 1];
            }

            currentParent.children.push(li);
            currentDepth = heading.depth;
        }
    }

    return fromHtml(options.template(toHtml(toc)), { fragment: true }).children;
};

/**
 * Rehype plugin to generate a table of contents.
 * @param userOptions Options for the plugin
 * @returns The plugin
 */
export const rehypeCustomToc: Plugin<[RehypeCustomTocOptions], Root> = (userOptions: RehypeCustomTocOptions) => {
    const options = { ...DEFAULT_OPTIONS, ...userOptions };

    /**
     * The transformer function for the plugin.
     * @param tree The HAST tree
     * @param vFile VFile data
     * @param vFile.data The VFile data
     */
    const transformer: Transformer<Root> = (tree: Root, { data }) => {
        if (!data.astro || data.astro.frontmatter.showToc !== true) return;

        let tocIndex = 0;
        visit<Root, string>(tree, "comment", (node, index) => {
            if (node.type === "comment" && node.value.trim().toLowerCase() === "toc" && typeof index !== "undefined") {
                tocIndex = index;
            }
        });

        /* eslint-disable no-underscore-dangle */
        if (!data.__astroHeadings) throw new Error("Headings data not found in the file data.");
        const headings = data.__astroHeadings;
        /* eslint-enable no-underscore-dangle */

        const toc = generateToc(options, headings);
        if (tocIndex) {
            // eslint-disable-next-line no-magic-numbers
            tree.children.splice(tocIndex, 1, ...toc);
        } else {
            tree.children.unshift(...toc);
        }
    };

    return transformer;
};