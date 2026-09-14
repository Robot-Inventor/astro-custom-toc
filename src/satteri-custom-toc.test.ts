import { expect, it } from "vitest";
import type { RehypeCustomTocOptions } from "./rehype-custom-toc.js";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { createSatteriTocPlugins } from "./satteri-custom-toc.js";

/**
 * Normalize whitespace between HTML tags for readable output comparisons.
 * @param html HTML output
 * @returns Normalized HTML output
 */
const normalizeHtml = (html: string): string => html.replace(/>\s+</gu, "><").trim();

const markdown = `
# Title

This is a sample markdown paragraph.

<!-- toc -->

## Section 1

### Subsection 1.1

#### Subsection 1.1.1
`.trim();

/**
 * Render Markdown with the Sätteri TOC plugins.
 * @param source Markdown source
 * @param options TOC options
 * @param frontmatter Document frontmatter
 * @returns Rendered HTML
 */
const renderMarkdown = async (
    source: string,
    options?: RehypeCustomTocOptions,
    frontmatter: Record<string, unknown> = { showToc: true }
): Promise<string> => {
    const processor = await createSatteriMarkdownProcessor({
        hastPlugins: createSatteriTocPlugins(options),
        syntaxHighlight: false
    });
    const result = await processor.render(source, { frontmatter });
    return result.code;
};

/**
 * Wrap the TOC list in a custom container.
 * @param html TOC list HTML
 * @returns Wrapped TOC HTML
 */
const customTemplate = (html: string): string => `<div class="toc-wrapper">${html}</div>`;

it("satteri-custom-toc matches the README example output", async () => {
    const result = await renderMarkdown(markdown);

    const expected = `
<h1 id="title">Title</h1>
<p>This is a sample markdown paragraph.</p>
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        <ul>
            <li><a href="#title">Title</a></li>
            <ul>
                <li><a href="#section-1">Section 1</a></li>
                <ul>
                    <li><a href="#subsection-11">Subsection 1.1</a></li>
                </ul>
            </ul>
        </ul>
    </nav>
</aside>
<h2 id="section-1">Section 1</h2>
<h3 id="subsection-11">Subsection 1.1</h3>
<h4 id="subsection-111">Subsection 1.1.1</h4>`.trim();

    expect(normalizeHtml(result)).toBe(normalizeHtml(expected));
});

it("satteri-custom-toc uses a custom template when provided", async () => {
    const result = await renderMarkdown(markdown, { template: customTemplate });

    const expected = `
<h1 id="title">Title</h1>
<p>This is a sample markdown paragraph.</p>
<div class="toc-wrapper">
    <ul>
        <li><a href="#title">Title</a></li>
        <ul>
            <li><a href="#section-1">Section 1</a></li>
            <ul>
                <li><a href="#subsection-11">Subsection 1.1</a></li>
            </ul>
        </ul>
    </ul>
</div>
<h2 id="section-1">Section 1</h2>
<h3 id="subsection-11">Subsection 1.1</h3>
<h4 id="subsection-111">Subsection 1.1.1</h4>`.trim();

    expect(normalizeHtml(result)).toBe(normalizeHtml(expected));
});

it("satteri-custom-toc respects maxDepth of 2", async () => {
    const result = await renderMarkdown(markdown, { maxDepth: 2 });

    const expected = `
<h1 id="title">Title</h1>
<p>This is a sample markdown paragraph.</p>
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        <ul>
            <li><a href="#title">Title</a></li>
            <ul>
                <li><a href="#section-1">Section 1</a></li>
            </ul>
        </ul>
    </nav>
</aside>
<h2 id="section-1">Section 1</h2>
<h3 id="subsection-11">Subsection 1.1</h3>
<h4 id="subsection-111">Subsection 1.1.1</h4>`.trim();

    expect(normalizeHtml(result)).toBe(normalizeHtml(expected));
});

it("satteri-custom-toc respects maxDepth of 4", async () => {
    const result = await renderMarkdown(markdown, { maxDepth: 4 });

    const expected = `
<h1 id="title">Title</h1>
<p>This is a sample markdown paragraph.</p>
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        <ul>
            <li><a href="#title">Title</a></li>
            <ul>
                <li><a href="#section-1">Section 1</a></li>
                <ul>
                    <li><a href="#subsection-11">Subsection 1.1</a></li>
                    <ul>
                        <li><a href="#subsection-111">Subsection 1.1.1</a></li>
                    </ul>
                </ul>
            </ul>
        </ul>
    </nav>
</aside>
<h2 id="section-1">Section 1</h2>
<h3 id="subsection-11">Subsection 1.1</h3>
<h4 id="subsection-111">Subsection 1.1.1</h4>`.trim();

    expect(normalizeHtml(result)).toBe(normalizeHtml(expected));
});

it("satteri-custom-toc uses ordered lists when ordered is true", async () => {
    const result = await renderMarkdown(markdown, { ordered: true });

    const expected = `
<h1 id="title">Title</h1>
<p>This is a sample markdown paragraph.</p>
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        <ol>
            <li><a href="#title">Title</a></li>
            <ol>
                <li><a href="#section-1">Section 1</a></li>
                <ol>
                    <li><a href="#subsection-11">Subsection 1.1</a></li>
                </ol>
            </ol>
        </ol>
    </nav>
</aside>
<h2 id="section-1">Section 1</h2>
<h3 id="subsection-11">Subsection 1.1</h3>
<h4 id="subsection-111">Subsection 1.1.1</h4>`.trim();

    expect(normalizeHtml(result)).toBe(normalizeHtml(expected));
});

it("satteri-custom-toc inserts the TOC at the beginning when the marker is omitted", async () => {
    const result = await renderMarkdown(markdown.replace("<!-- toc -->", ""));

    const expected = `
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        <ul>
            <li><a href="#title">Title</a></li>
            <ul>
                <li><a href="#section-1">Section 1</a></li>
                <ul>
                    <li><a href="#subsection-11">Subsection 1.1</a></li>
                </ul>
            </ul>
        </ul>
    </nav>
</aside>
<h1 id="title">Title</h1>
<p>This is a sample markdown paragraph.</p>
<h2 id="section-1">Section 1</h2>
<h3 id="subsection-11">Subsection 1.1</h3>
<h4 id="subsection-111">Subsection 1.1.1</h4>`.trim();

    expect(normalizeHtml(result)).toBe(normalizeHtml(expected));
});

it("satteri-custom-toc does not render the TOC when showToc is false", async () => {
    const result = await renderMarkdown(markdown, {}, { showToc: false });

    expect(result).not.toContain('<aside class="toc">');
    expect(result).toContain("<!-- toc -->");
});

it("satteri-custom-toc isolates state between documents", async () => {
    const processor = await createSatteriMarkdownProcessor({
        hastPlugins: createSatteriTocPlugins(),
        syntaxHighlight: false
    });
    const firstResult = await processor.render("# Same\n\n<!-- toc -->", { frontmatter: { showToc: true } });
    const secondResult = await processor.render("# Same\n\n<!-- toc -->", { frontmatter: { showToc: true } });

    expect(firstResult.code).toContain('<li><a href="#same">Same</a></li>');
    expect(secondResult.code).toBe(firstResult.code);
});

it("satteri-custom-toc generates unique IDs for duplicate headings", async () => {
    const result = await renderMarkdown("# Same\n\n# Same\n\n<!-- toc -->");

    expect(result).toContain('<h1 id="same">Same</h1>');
    expect(result).toContain('<h1 id="same-1">Same</h1>');
    expect(result).toContain('<li><a href="#same">Same</a></li>');
    expect(result).toContain('<li><a href="#same-1">Same</a></li>');
});

it("satteri-custom-toc preserves explicit heading IDs", async () => {
    const processor = await createSatteriMarkdownProcessor({
        features: { headingAttributes: true },
        hastPlugins: createSatteriTocPlugins(),
        syntaxHighlight: false
    });
    const result = await processor.render("# Title {#custom-id}\n\n<!-- toc -->", { frontmatter: { showToc: true } });

    expect(result.code).toContain('<h1 id="custom-id">Title</h1>');
    expect(result.code).toContain('<li><a href="#custom-id">Title</a></li>');
});

it("satteri-custom-toc replaces empty heading IDs", async () => {
    const processor = await createSatteriMarkdownProcessor({
        hastPlugins: [
            {
                element: {
                    filter: ["h1"],
                    /**
                     * Set an empty heading ID before the TOC plugin runs.
                     * @param node Heading node
                     * @param ctx Sätteri visitor context
                     */
                    visit(node, ctx): void {
                        ctx.setProperty(node, "id", "");
                    }
                },
                name: "set-empty-heading-id"
            },
            ...createSatteriTocPlugins()
        ],
        syntaxHighlight: false
    });
    const result = await processor.render("# Title\n\n<!-- toc -->", { frontmatter: { showToc: true } });

    expect(result.code).toContain('<h1 id="title">Title</h1>');
    expect(result.code).toContain('<li><a href="#title">Title</a></li>');
    expect(result.code).not.toContain('href="#"');
});
