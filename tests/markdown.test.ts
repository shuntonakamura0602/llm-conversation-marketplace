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
    createElement(
      Markdown,
      {
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
      },
      source,
    ),
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

import {
  normalizeMath,
  markdownRemarkPlugins,
  markdownRehypePlugins,
} from "../lib/markdown.ts";
function renderConversation(source: string) {
  return renderToStaticMarkup(
    createElement(
      Markdown,
      {
        skipHtml: true,
        remarkPlugins: markdownRemarkPlugins,
        rehypePlugins: markdownRehypePlugins,
      },
      normalizeMath(source),
    ),
  );
}
test("Japanese punctuation next to bold delimiters renders strongly", () => {
  const html = renderConversation(
    "これを**固有時間（proper time）**といいます。**有限**です。",
  );
  assert.ok(html.includes("<strong>固有時間（proper time）</strong>"));
  assert.ok(!html.includes("**"));
});
test("ChatGPT display and inline LaTeX, plus dollar syntax, render as math", () => {
  const source = String.raw`\[
d\tau
=
dt\sqrt{1-\frac{r_s}{r}}
\]

時間は\(d\tau\)です。$x^2$。

$$
\frac{a}{b}
$$`;
  const html = renderConversation(source);
  assert.equal((html.match(/class="katex"/g) || []).length, 4);
  assert.equal((html.match(/class="katex-display"/g) || []).length, 2);
  assert.ok(!html.includes("<h1>"));
});
test("code and deliberately escaped Markdown stay literal", () => {
  const source =
    "```text\n**bold** \\[x\\]\n```\n\n`\\(x\\) **bold**`\n\n\\*\\*literal\\*\\*";
  assert.equal(normalizeMath(source), source);
  const html = renderConversation(source);
  assert.ok(!html.includes("<strong>"));
  assert.ok(!html.includes('class="katex"'));
});
test("invalid or untrusted math does not inject HTML or abort rendering", () => {
  const html = renderConversation(
    String.raw`$\frac{$ $\href{javascript:alert(1)}{x}$`,
  );
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes("katex-error"));
});
