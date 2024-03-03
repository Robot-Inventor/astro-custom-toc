# astro-custom-toc

Astro Integration to generate a customizable table of contents.

> [!WARNING]
> This plugin uses [remark-comment](https://github.com/leebyron/remark-comment). It may break other plug-ins that use comments.

## Installation

```bash
npx astro add astro-custom-toc
```

### Manual Install

Install the package

```bash
npm install astro-custom-toc
```

Add the plugin to your `astro.config.mjs`. **This plugin must be inserted before the [mdx()](https://github.com/withastro/astro/tree/main/packages/integrations/mdx/) plugin if you are using it.**

```javascript
import { defineConfig } from "astro/config";
import { remarkCustomToc } from "./src/plugins/remark-toc";

// https://astro.build/config
export default defineConfig({
    // ... other config
    integrations: [remarkCustomToc(), mdx()]
});
```

## Usage

To include a table of contents in your markdown file, add ``showToc: true`` to the frontmatter of the markdown file. The table of contents will be inserted at the location of the `<!-- toc -->` comment or at the beginning of the file if no comment is found.

```markdown
---
showToc: true
---

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

<!-- toc -->

## Section 1

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Subsection 1.1

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
```

## Options

```typescript
type RemarkCustomTocTemplate = (html: string) => string;

interface RemarkCustomTocOptions {
    template?: RemarkCustomTocTemplate;
    maxDepth?: number;
    ordered?: boolean;
}
```

### `template`

A function that takes the generated HTML and returns the final HTML. This can be used to wrap the generated HTML in a custom template.

Default:

```javascript
const defaultTemplate = (html) => {
    return `
<aside class="toc">
    <h2>Contents</h2>
    <nav>
        ${html}
    </nav>
</aside>`.trim();
};
```

### `maxDepth`

The maximum depth of headings to include in the table of contents.

Default: `3`

### `ordered`

Whether to use an ordered list (`<ol>`) or an unordered list (`<ul>`).

Default: `false`
