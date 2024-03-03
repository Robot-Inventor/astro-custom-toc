import type { AstroUserConfig } from "astro";
import { visit } from "unist-util-visit";
import Slugger from "github-slugger";
import { JSDOM } from "jsdom";

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

type RemarkPlugin = NonNullable<NonNullable<AstroUserConfig["markdown"]>["remarkPlugins"]>[number];

interface VFile {
    data: {
        astro?: {
            frontmatter: Record<string, any>;
        };
    };
}

interface CommentNode {
    type: "comment";
    value: "";
    commentValue: string;
}

const defaultTemplate = (html: string) => {
    return `
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        ${html}
    </nav>
</aside>`.trim();
};

export const remarkCustomToc: RemarkPlugin = ({
    template = defaultTemplate,
    maxDepth = 3,
    ordered = false
}: RemarkCustomTocOptions = {}) => {
    return (tree, { data }: VFile) => {
        if (data.astro && data.astro.frontmatter.showToc !== true) return;

        const slugs = new Slugger();
        slugs.reset();

        const headings: Heading[] = [];
        visit(tree, "heading", (node) => {
            const { depth } = node;
            const textNode = node.children[0];
            // @ts-ignore
            const text = textNode ? textNode.value : "";
            const slug = slugs.slug(text);
            // @ts-ignore
            node.data = { id: slug };
            headings.push({ slug, text, depth });
        });

        let tocIndex = 0;
        visit(tree, "comment", (node: CommentNode, index) => {
            if (node.commentValue.trim().toLowerCase() === "toc" && index !== undefined) {
                tocIndex = index;
            }
        });

        visit(tree, "html", (node, index) => {
            if (node.value.trim().toLowerCase() === "<!-- toc -->" && index !== undefined) {
                tocIndex = index;
            }
        });

        const toc = generateToc(template, maxDepth, ordered, headings);
        if (tocIndex === 0) {
            // @ts-ignore
            tree.children.unshift(toc);
        } else {
            // @ts-ignore
            tree.children.splice(tocIndex, 1, toc);
        }
    };
};

const generateToc = (template: RemarkCustomTocTemplate, maxDepth: number, ordered: boolean, headings: Heading[]) => {
    const { document } = new JSDOM().window;

    const toc: HTMLElement = document.createElement(ordered ? "ol" : "ul");
    let currentDepth = headings[0].depth;
    let currentParent = toc;
    for (const heading of headings) {
        if (heading.depth > maxDepth) continue;

        if (heading.depth === currentDepth) {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = `#${heading.slug}`;
            a.textContent = heading.text;
            li.appendChild(a);
            currentParent.appendChild(li);
            currentDepth = heading.depth;
        } else if (heading.depth > currentDepth) {
            const ul = document.createElement(ordered ? "ol" : "ul");
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = `#${heading.slug}`;
            a.textContent = heading.text;
            li.appendChild(a);
            ul.appendChild(li);
            currentParent.appendChild(ul);
            currentParent = ul;
            currentDepth = heading.depth;
        } else {
            for (let i = 0; i < currentDepth - heading.depth; i++) {
                currentParent = currentParent.parentElement!;
            }
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = `#${heading.slug}`;
            a.textContent = heading.text;
            li.appendChild(a);
            currentParent.appendChild(li);
            currentDepth = heading.depth;
        }
    }

    return {
        type: "html",
        value: template(toc.outerHTML)
    };
};
