import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMessages, readingMinutes } from "../lib/parser.ts";
test("parses CRLF, mixed case, multiline and code without losing content", () => {
  assert.deepEqual(
    parseMessages(
      "user:\r\n問い\r\n\r\nAssistant:\r\n```ts\r\nconst user = 1;\r\n```",
    ),
    [
      { role: "user", content: "問い" },
      { role: "assistant", content: "```ts\nconst user = 1;\n```" },
    ],
  );
});
test("rejects missing, empty, or nonalternating roles and stray preface", () => {
  for (const text of [
    "",
    "本文\nUSER:\nx\nASSISTANT:\ny",
    "USER:\nx",
    "ASSISTANT:\nx\nUSER:\ny",
    "USER:\nx\nASSISTANT:\n",
    "USER:\nx\nUSER:\ny\nASSISTANT:\nz",
  ])
    assert.throws(() => parseMessages(text));
});
test("reading time reflects actual content length", () => {
  assert.equal(
    readingMinutes([{ role: "user", content: "あ".repeat(601) }]),
    2,
  );
  assert.equal(readingMinutes([]), 1);
});
