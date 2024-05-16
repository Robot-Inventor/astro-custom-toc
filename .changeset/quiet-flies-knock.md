---
"astro-custom-toc": major
---

feat: improve compatibility with other plugins #20

BREAKING CHANGE: The `astro-custom-toc` plugin now uses Astro's default headings plugin to generate slugs for headings. This may result in changes to the slugs of headings with complex child elements, potentially breaking existing links.
