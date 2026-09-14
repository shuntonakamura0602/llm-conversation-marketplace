import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { readingMarkers } from "../lib/reading-markers.ts";

test("Markdown keeps formatting and reading markers intact and blocks unsafe HTML/URLs", () => {
  const source =
    "# Heading\n\n**bold** and `code`\n\n- item\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```js\nconst a = 1;\n```\n\n<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)";
  const html = renderToStaticMarkup(
    createElement(Markdown, {
      skipHtml: true,
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        [
          readingMarkers,
          [
            { percent: 25, offset: 18 },
            { percent: 100, offset: source.length },
          ],
        ],
      ],
    }, source),
  );
  for (const tag of [
    "<h1>",
    "<strong>bold</strong>",
    "<code>",
    "<li>",
    "<table>",
    "<pre>",
  ])
    assert.ok(html.includes(tag), tag);
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("javascript:"));
  assert.equal((html.match(/data-reading-marker=/g) || []).length, 2);
  assert.ok(html.includes('data-reading-marker="100"'));
});
