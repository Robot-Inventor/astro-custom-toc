import type { RehypeCustomTocOptions, RehypeCustomTocTemplate } from "rehype-custom-toc";
import Slugger from "github-slugger";
import { defineHastPlugin } from "satteri";

/**
 * Default TOC template that wraps the list HTML in an `<aside>` container.
 * @param html HTML content of the TOC list
 * @returns Wrapped HTML content
 */
const DEFAULT_TEMPLATE: RehypeCustomTocTemplate = (html) =>
    `
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        ${html}
    </nav>
</aside>`.trim();

const DEFAULT_OPTIONS: Required<RehypeCustomTocOptions> = {
    maxDepth: 3,
    ordered: false,
    template: DEFAULT_TEMPLATE
};

/** Per-document data-bag key: whether the TOC was already inserted by the marker plugin. */
const TOC_HANDLED_KEY = "astroCustomTocHandled";

/** Per-document data-bag key: collected heading data. */
const HEADINGS_KEY = "astroCustomTocHeadings";

/** Per-document data-bag key: the GitHubSlugger instance. */
const SLUGGER_KEY = "astroCustomTocSlugger";

interface TocHeading {
    depth: number;
    slug: string;
    text: string;
}

interface TocListNode {
    children: Array<string | TocListNode>;
    tag: string;
}

type SatteriTocPlugin = ReturnType<typeof defineHastPlugin>;

/**
 * Escape HTML special characters in a string so it is safe to inline inside element contents and attribute values.
 * @param str The string to escape
 * @returns The escaped string
 */
const escapeHtml = (str: string): string =>
    str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/**
 * Serialize a TOC list node tree into an HTML string.
 * @param node The node to serialize
 * @returns The HTML string
 */
const serializeTocNode = (node: TocListNode): string =>
    `<${node.tag}>${node.children
        .map((child) => (typeof child === "string" ? child : serializeTocNode(child)))
        .join("")}</${node.tag}>`;

/**
 * Build the nested TOC list HTML from heading data using the same parent-stack algorithm as `rehype-custom-toc`.
 * @param headings The headings to include
 * @param options The resolved options
 * @returns The generated list HTML string, or an empty string when no headings match
 */
// eslint-disable-next-line max-statements
const generateTocListHtml = (headings: readonly TocHeading[], options: Required<RehypeCustomTocOptions>): string => {
    const filteredHeadings = headings.filter((heading) => heading.depth <= options.maxDepth);
    if (!filteredHeadings.length) return "";

    const tag = options.ordered ? "ol" : "ul";
    const root: TocListNode = { children: [], tag };
    let currentParent: TocListNode = root;
    const [firstHeading] = filteredHeadings;
    if (!firstHeading) return "";
    let currentDepth = firstHeading.depth;
    const parents: TocListNode[] = [root];

    for (const heading of filteredHeadings) {
        const listItem = `<li><a href="#${escapeHtml(heading.slug)}">${escapeHtml(heading.text)}</a></li>`;

        if (heading.depth === currentDepth) {
            currentParent.children.push(listItem);
        } else if (heading.depth > currentDepth) {
            const nested: TocListNode = { children: [listItem], tag };
            currentParent.children.push(nested);
            currentParent = nested;
            parents.push(currentParent);
            currentDepth = heading.depth;
        } else {
            for (let index = 0; index < currentDepth - heading.depth; index++) {
                parents.pop();
                // eslint-disable-next-line no-magic-numbers
                currentParent = parents.at(-1) ?? root;
            }
            currentParent.children.push(listItem);
            currentDepth = heading.depth;
        }
    }

    return serializeTocNode(root);
};

/**
 * Create a raw HAST node containing the complete TOC HTML (template-applied).
 * @param headings The headings to include in the TOC
 * @param options The resolved options
 * @returns A raw HAST node, or `null` when no headings match
 */
const createTocNode = (
    headings: readonly TocHeading[],
    options: Required<RehypeCustomTocOptions>
): { type: "raw"; value: string } | null => {
    const listHtml = generateTocListHtml(headings, options);
    if (!listHtml) return null;
    return { type: "raw", value: options.template(listHtml) };
};

/**
 * Check whether the TOC is enabled via `showToc: true` in the document frontmatter.
 * @param data The Sätteri document-level data bag
 * @returns `true` when TOC rendering is requested
 */
const isTocEnabled = (data: Record<string, unknown>): boolean => {
    const astro = data["astro"] as { frontmatter: Record<string, unknown> } | undefined;
    return astro?.frontmatter["showToc"] === true;
};

/**
 * Read the collected headings from the per-document data bag.
 * @param data The Sätteri document-level data bag
 * @returns The collected headings array (may be empty)
 */
const readHeadings = (data: Record<string, unknown>): TocHeading[] =>
    (data[HEADINGS_KEY] as TocHeading[] | undefined) ?? [];

/**
 * Get or create a per-document slugger, storing it in the data bag to avoid closure state leaking across documents.
 * @param data The Sätteri document-level data bag
 * @returns The slugger instance
 */
const getSlugger = (data: Record<string, unknown>): Slugger => {
    const existing = data[SLUGGER_KEY] as Slugger | undefined;
    if (existing) return existing;
    const slugger = new Slugger();
    data[SLUGGER_KEY] = slugger;
    return slugger;
};

/**
 * Create the heading-collector plugin that sets heading IDs and collects heading data into `ctx.data`.
 * @returns The Sätteri HAST plugin definition
 */
const createHeadingCollector = (): SatteriTocPlugin =>
    defineHastPlugin({
        element: {
            filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
            // eslint-disable-next-line jsdoc/require-jsdoc
            visit(node, ctx) {
                const slugger = getSlugger(ctx.data);
                const text = ctx.textContent(node);
                // eslint-disable-next-line no-magic-numbers
                const depth = Number.parseInt(node.tagName.slice(1), 10);
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                const existingId = node.properties?.["id"];
                const slug = typeof existingId === "string" ? existingId : slugger.slug(text);

                if (typeof existingId !== "string") {
                    ctx.setProperty(node, "id", slug);
                }

                const headings = readHeadings(ctx.data);
                headings.push({ depth, slug, text });
                ctx.data[HEADINGS_KEY] = headings;
            }
        },
        name: "astro-custom-toc-heading-collector"
    });

/**
 * Create the marker plugin that finds `<!-- toc -->` and replaces it with the generated TOC.
 * @param options The resolved TOC options
 * @returns The Sätteri HAST plugin definition
 */
const createMarkerPlugin = (options: Required<RehypeCustomTocOptions>): SatteriTocPlugin =>
    defineHastPlugin({
        // eslint-disable-next-line jsdoc/require-jsdoc
        comment(node, ctx) {
            if (ctx.data[TOC_HANDLED_KEY] === true || node.value.trim().toLowerCase() !== "toc") return;
            if (!isTocEnabled(ctx.data)) return;

            ctx.data[TOC_HANDLED_KEY] = true;

            const tocNode = createTocNode(readHeadings(ctx.data), options);
            const parent = ctx.parent(node);
            const isWrappedInParagraph =
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-magic-numbers
                parent?.type === "element" && parent.tagName === "p" && parent.children.length === 1;
            const target = isWrappedInParagraph ? parent : node;

            if (tocNode) {
                ctx.replaceNode(target, tocNode);
            } else {
                ctx.removeNode(target);
            }
        },
        name: "astro-custom-toc-marker"
    });

/**
 * Create the fallback plugin that inserts the TOC before the first element when no `<!-- toc -->` marker exists.
 * @param options The resolved TOC options
 * @returns The Sätteri HAST plugin definition
 */
const createFallbackPlugin = (options: Required<RehypeCustomTocOptions>): SatteriTocPlugin =>
    defineHastPlugin({
        element: {
            filter: [],
            // eslint-disable-next-line jsdoc/require-jsdoc
            visit(node, ctx) {
                if (ctx.data[TOC_HANDLED_KEY] === true) return;
                ctx.data[TOC_HANDLED_KEY] = true;
                if (!isTocEnabled(ctx.data)) return;

                const tocNode = createTocNode(readHeadings(ctx.data), options);
                if (!tocNode) return;

                ctx.insertBefore(node, tocNode);
            }
        },
        name: "astro-custom-toc-fallback"
    });

/**
 * Create the Sätteri HAST plugins for TOC generation.
 *
 * Three plugins are returned and must be appended to `hastPlugins` in order:
 * 1. Heading collector — sets heading IDs and collects heading data into `ctx.data`.
 * 2. Marker — finds `<!-- toc -->` and replaces it with the generated TOC.
 * 3. Fallback — if no marker was found, inserts the TOC before the first element.
 *
 * All per-document state lives in `ctx.data` (never in closures) to avoid leaking across documents.
 * @param userOptions Options for the TOC
 * @returns An array of three Sätteri HAST plugin definitions
 */
const createSatteriTocPlugins = (userOptions?: RehypeCustomTocOptions): SatteriTocPlugin[] => {
    const options: Required<RehypeCustomTocOptions> = { ...DEFAULT_OPTIONS, ...userOptions };
    return [createHeadingCollector(), createMarkerPlugin(options), createFallbackPlugin(options)];
};

export { createSatteriTocPlugins };
