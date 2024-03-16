import type { Html, Node, Nodes, Root } from "mdast";
import { JSDOM } from "jsdom";
import type { Plugin } from "unified";
import Slugger from "github-slugger";
import { visit } from "unist-util-visit";

interface Heading {
    slug: string;
    text: string;
    depth: number;
}

export type RemarkCustomTocTemplate = (html: string) => string;

export interface RemarkCustomTocOptions {
    template?: RemarkCustomTocTemplate;
    maxDepth?: number;
    ordered?: boolean;
}

interface VFile {
    data: {
        astro?: {
            frontmatter: Record<string, unknown>;
        };
    };
}

interface Comment extends Node {
    type: "comment";
    value: "";
    commentValue: string;
}

declare module "mdast" {
    interface RootContentMap {
        comment: Comment;
    }

    interface Data {
        id: string;
    }
}

const defaultTemplate = (html: string): string =>
    `
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        ${html}
    </nav>
</aside>`.trim();

const defaultOptions = {
    maxDepth: 3,
    ordered: false,
    template: defaultTemplate
} as const satisfies Required<RemarkCustomTocOptions>;

const isTocCommentNode = (node: Nodes): node is Comment =>
    node.type === "comment" && node.commentValue.trim().toLowerCase() === "toc";

// eslint-disable-next-line max-statements
const generateToc = (options: Required<RemarkCustomTocOptions>, headings: Heading[]): Html => {
    const { document } = new JSDOM().window;

    const toc: HTMLElement = document.createElement(options.ordered ? "ol" : "ul");
    let currentDepth = headings[0].depth;
    let currentParent = toc;
    for (const heading of headings) {
        // eslint-disable-next-line no-continue
        if (heading.depth > options.maxDepth) continue;

        if (heading.depth === currentDepth) {
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = `#${heading.slug}`;
            link.textContent = heading.text;
            li.appendChild(link);
            currentParent.appendChild(li);
            currentDepth = heading.depth;
        } else if (heading.depth > currentDepth) {
            const ul = document.createElement(options.ordered ? "ol" : "ul");
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = `#${heading.slug}`;
            link.textContent = heading.text;
            li.appendChild(link);
            ul.appendChild(li);
            currentParent.appendChild(ul);
            currentParent = ul;
            currentDepth = heading.depth;
        } else {
            // eslint-disable-next-line id-length
            for (let i = 0; i < currentDepth - heading.depth; i++) {
                currentParent = currentParent.parentElement!;
            }
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = `#${heading.slug}`;
            link.textContent = heading.text;
            li.appendChild(link);
            currentParent.appendChild(li);
            currentDepth = heading.depth;
        }
    }

    return {
        type: "html",
        value: options.template(toc.outerHTML)
    };
};

export const remarkCustomToc: Plugin<[RemarkCustomTocOptions], Root> = (userOptions: RemarkCustomTocOptions) => {
    const options = { ...defaultOptions, ...userOptions };

    // eslint-disable-next-line max-statements
    return (tree, { data }: VFile) => {
        if (data.astro && data.astro.frontmatter.showToc !== true) return;

        const slugs = new Slugger();
        slugs.reset();

        const headings: Heading[] = [];
        visit(tree, "heading", (node): void => {
            const { depth } = node;
            // eslint-disable-next-line no-extra-parens
            const text = node.children.map((children) => ("value" in children ? children.value : "")).join("");
            const slug = slugs.slug(text);
            node.data = { id: slug };
            headings.push({ depth, slug, text });
        });

        let tocIndex = 0;
        visit<Root, string>(tree, "comment", (node, index) => {
            if (isTocCommentNode(node) && typeof index !== "undefined") {
                tocIndex = index;
            }
        });

        const toc = generateToc(options, headings);
        if (tocIndex) {
            // eslint-disable-next-line no-magic-numbers
            tree.children.splice(tocIndex, 1, toc);
        } else {
            tree.children.unshift(toc);
        }
    };
};
