import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractShareHtml,
  importShare,
  normalizeShareUrl,
} from "../lib/share-import.ts";
import { validateImportedMessages } from "../lib/parser.ts";
const url = "https://chatgpt.com/share/6aa62f40-6528-83ee-81c1-09d079071e9d";
function message(
  role: string,
  content: string,
  extra: Record<string, unknown> = {},
) {
  return {
    author: { role },
    content: { content_type: "text", parts: [content] },
    ...extra,
  };
}
function legacy(conversation: unknown) {
  return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { serverResponse: { data: conversation } } } })}</script>`;
}
function tableOf(value: unknown) {
  const table: unknown[] = [];
  function add(v: unknown): number {
    const i = table.length;
    table.push(null);
    if (Array.isArray(v)) table[i] = v.map(add);
    else if (v && typeof v === "object")
      table[i] = Object.fromEntries(
        Object.entries(v).map(([k, x]) => [`_${add(k)}`, add(x)]),
      );
    else table[i] = v;
    return i;
  }
  add(value);
  return table;
}
test("only canonical HTTPS ChatGPT share URLs are fetched", () => {
  assert.equal(normalizeShareUrl(url + "/?tracking=1#x"), url);
  assert.equal(
    normalizeShareUrl(url.replace("chatgpt.com", "chat.openai.com")),
    url,
  );
  for (const value of [
    "http://127.0.0.1/share/x",
    "https://chatgpt.com.evil.test/share/x",
    url.replace("chatgpt.com", "chatgpt.com@evil.test"),
    url.replace("chatgpt.com", "user@chatgpt.com"),
    url.replace("chatgpt.com", "chatgpt.com:444"),
    "file:///etc/passwd",
    "https://chatgpt.com/c/123",
    "https://chatgpt.com/share/not-a-share",
  ])
    assert.throws(() => normalizeShareUrl(value));
});
test("current React Router data preserves long text, literal role labels, and excludes hidden/internal content", () => {
  const answer =
    "  長い回答\n\n```text\nUSER:\nこれは引用です\n```\n" +
    "対話の本文。".repeat(3000);
  const data = {
    title: "長い対話",
    linear_conversation: [
      { message: message("system", "秘密") },
      { message: message("user", "質問") },
      {
        message: message("assistant", "非表示", {
          metadata: { is_visually_hidden_from_conversation: true },
        }),
      },
      { message: message("assistant", "内部処理", { channel: "analysis" }) },
      { message: message("tool", "ツール出力") },
      { message: message("assistant", answer, { channel: "final" }) },
    ],
  };
  const table = tableOf({
    loaderData: { share: { serverResponse: { data } } },
  });
  const html = `<script>window.__reactRouterContext.streamController.enqueue(${JSON.stringify(JSON.stringify(table))});</script><script>throw new Error('must never execute')</script>`;
  const result = extractShareHtml(html, url);
  assert.deepEqual(result.messages, [
    { role: "user", content: "質問" },
    { role: "assistant", content: answer },
  ]);
  assert.equal(result.title, "長い対話");
  assert.deepEqual(validateImportedMessages(result.messages), result.messages);
});
test("selected branch is followed instead of mixing regenerated answers", () => {
  const data = {
    title: "分岐",
    current_node: "selected",
    mapping: {
      root: { parent: null },
      q: { parent: "root", message: message("user", "質問") },
      old: { parent: "q", message: message("assistant", "古い回答") },
      selected: { parent: "q", message: message("assistant", "選択した回答") },
    },
    linear_conversation: [{ message: message("user", "間違った分岐") }],
  };
  assert.equal(
    extractShareHtml(legacy(data), url).messages[1].content,
    "選択した回答",
  );
});
test("nontext content is identified rather than silently removed", () => {
  const data = {
    title: "画像",
    linear_conversation: [
      {
        message: {
          author: { role: "user" },
          content: {
            content_type: "multimodal_text",
            parts: ["この画像は？", { asset_pointer: "private-image" }],
          },
        },
      },
      { message: message("assistant", "回答") },
    ],
  };
  const result = extractShareHtml(legacy(data), url);
  assert.equal(result.warnings.length, 1);
  assert.match(result.messages[0].content, /画像・添付ファイル/);
  assert.doesNotMatch(JSON.stringify(result), /private-image/);
});
test("incomplete or unsupported content fails without fabricating a conversation", () => {
  assert.throws(() => extractShareHtml("<html>Login</html>", url));
  for (const nodes of [
    [{ message: message("user", "質問") }],
    [
      { message: message("user", "質問") },
      { message: message("user", "別の質問") },
      { message: message("assistant", "回答") },
    ],
    [
      { message: message("user", "質問") },
      { message: message("assistant", "あ".repeat(100001)) },
    ],
  ])
    assert.throws(() =>
      extractShareHtml(legacy({ linear_conversation: nodes }), url),
    );
});
test("network requests reject redirects, blocked pages, unexpected types and oversized bodies", async () => {
  for (const response of [
    new Response("", {
      status: 302,
      headers: { location: "http://127.0.0.1" },
    }),
    new Response("", { status: 403 }),
    new Response("", { status: 404 }),
    new Response("{}", { headers: { "content-type": "application/json" } }),
    new Response("x", {
      headers: { "content-type": "text/html", "content-length": "9000000" },
    }),
  ]) {
    let calls = 0;
    await assert.rejects(
      importShare(url, async (input, init) => {
        calls++;
        assert.equal(input, url);
        assert.equal(init?.redirect, "manual");
        assert.equal(init?.cache, "no-store");
        return response;
      }),
    );
    assert.equal(calls, 1);
  }
});
test("structured message validation rejects forged roles and preserves exact contents", () => {
  assert.throws(() =>
    validateImportedMessages([
      { role: "system", content: "x" },
      { role: "assistant", content: "y" },
    ]),
  );
  assert.throws(() =>
    validateImportedMessages([
      { role: "user", content: {} },
      { role: "assistant", content: "y" },
    ]),
  );
  const messages = [
    { role: "user", content: "質問\nASSISTANT:\n引用" },
    { role: "assistant", content: "\n回答\n" },
  ];
  assert.deepEqual(validateImportedMessages(messages), messages);
});
