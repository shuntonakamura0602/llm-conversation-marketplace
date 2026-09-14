import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import type { Root, RootContent, Parent } from "mdast";
import type { PluggableList } from "unified";

// Parse first so literal examples in fenced/indented/inline code are untouched.
export function normalizeMath(source: string): string {
  const tree = unified().use(remarkParse).use(remarkMath).parse(source);
  const ranges: { start: number; end: number }[] = [];
  function visit(node: Root | RootContent) {
    if (
      ["code", "inlineCode", "html", "math", "inlineMath"].includes(node.type)
    ) {
      const start = node.position?.start.offset,
        end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) ranges.push({ start, end });
      return;
    }
    if ("children" in node) node.children.forEach(visit);
  }
  visit(tree);
  const convert = (text: string) =>
    text.replace(
      /(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]|(?<!\\)\\\(([^\n]*?)(?<!\\)\\\)/g,
      (_match, display: string | undefined, inline: string | undefined) =>
        display !== undefined
          ? `\n$$\n${display.trim()}\n$$\n`
          : `$${inline!.trim()}$`,
    );
  let result = "",
    cursor = 0;
  for (const { start, end } of ranges.sort((a, b) => a.start - b.start)) {
    result += convert(source.slice(cursor, start)) + source.slice(start, end);
    cursor = end;
  }
  return result + convert(source.slice(cursor));
}

// CommonMark leaves **日本語（English）** literal when followed by Japanese.
// Recover balanced pairs in text nodes only; code, math and escaped examples stay literal.
export function remarkJapaneseStrong() {
  return (tree: Root, file: { value: unknown }) => {
    const source = String(file.value);
    function visit(parent: Parent) {
      parent.children = parent.children.flatMap((node): RootContent[] => {
        if (node.type !== "text") {
          if ("children" in node) visit(node as Parent);
          return [node];
        }
        const raw = source.slice(
          node.position?.start.offset,
          node.position?.end.offset,
        );
        if (raw.includes("\\*")) return [node];
        const parts: RootContent[] = [];
        const pattern = /\*\*([^*\n]+)\*\*/g;
        let cursor = 0;
        for (const match of node.value.matchAll(pattern)) {
          if (!match[1].trim()) continue;
          parts.push({
            type: "text",
            value: node.value.slice(cursor, match.index),
          });
          parts.push({
            type: "strong",
            children: [{ type: "text", value: match[1] }],
          });
          cursor = match.index + match[0].length;
        }
        if (!cursor) return [node];
        parts.push({ type: "text", value: node.value.slice(cursor) });
        return parts;
      }) as Parent["children"];
    }
    visit(tree);
  };
}

export const markdownRemarkPlugins: PluggableList = [
  remarkGfm,
  remarkMath,
  remarkJapaneseStrong,
];
export const markdownRehypePlugins: PluggableList = [
  [
    rehypeKatex,
    { trust: false, strict: "ignore", maxExpand: 1000, maxSize: 20 },
  ],
];
