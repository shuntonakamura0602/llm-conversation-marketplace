import type { Message } from "./types.ts";

export type ImportedConversation = {
  title: string;
  messages: Message[];
  sourceUrl: string;
  warnings: string[];
};
export class ImportError extends Error {}
const MAX_HTML_BYTES = 8 * 1024 * 1024;
export function normalizeShareUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new ImportError("ChatGPTの共有URLを入力してください。");
  }
  if (
    url.protocol !== "https:" ||
    !["chatgpt.com", "chat.openai.com"].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    !/^\/share\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\/?$/i.test(
      url.pathname,
    )
  ) {
    throw new ImportError(
      "対応しているのは https://chatgpt.com/share/… 形式の共有URLです。",
    );
  }
  return `https://chatgpt.com${url.pathname.replace(/\/$/, "")}`;
}
function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
// React Router's flattened reference table. Decode data only; never execute scripts.
function decodeTable(table: unknown[]): unknown {
  if (table.length > 100000)
    throw new ImportError("共有データが大きすぎます。");
  const cache = new Map<number, unknown>();
  function read(index: unknown, depth: number): unknown {
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= table.length
    )
      return undefined;
    if (cache.has(index)) return cache.get(index);
    if (depth > 150)
      throw new ImportError("共有データの構造を読み取れませんでした。");
    const value = table[index];
    if (Array.isArray(value)) {
      // Framework tagged values (Promise, Date, etc.) are not conversation content.
      if (typeof value[0] === "string") return undefined;
      const result: unknown[] = [];
      cache.set(index, result);
      for (const item of value) result.push(read(item, depth + 1));
      return result;
    }
    const record = object(value);
    if (record) {
      const result: Record<string, unknown> = Object.create(null);
      cache.set(index, result);
      for (const [key, ref] of Object.entries(record)) {
        if (!/^_\d+$/.test(key)) continue;
        const name = table[Number(key.slice(1))];
        if (typeof name === "string") result[name] = read(ref, depth + 1);
      }
      return result;
    }
    return value;
  }
  return read(0, 0);
}
function findConversation(root: unknown): Record<string, unknown> | undefined {
  const stack = [root];
  const visited = new Set<unknown>();
  while (stack.length && visited.size < 100000) {
    const value = stack.pop();
    if (!value || typeof value !== "object" || visited.has(value)) continue;
    visited.add(value);
    const record = object(value);
    if (
      record &&
      (Array.isArray(record.linear_conversation) ||
        (object(record.mapping) && typeof record.current_node === "string"))
    )
      return record;
    stack.push(...Object.values(value));
  }
}
function conversationNodes(conversation: Record<string, unknown>): unknown[] {
  const mapping = object(conversation.mapping);
  // A mapping may contain abandoned branches. Follow only the selected leaf's parents.
  if (mapping && typeof conversation.current_node === "string") {
    const nodes: unknown[] = [];
    const visited = new Set<string>();
    let id: unknown = conversation.current_node;
    while (typeof id === "string") {
      if (visited.has(id))
        throw new ImportError("会話の分岐を読み取れませんでした。");
      visited.add(id);
      const node = object(mapping[id]);
      if (!node)
        throw new ImportError("共有されている会話の一部が不足しています。");
      nodes.push(node);
      id = node.parent;
    }
    return nodes.reverse();
  }
  return Array.isArray(conversation.linear_conversation)
    ? conversation.linear_conversation
    : [];
}
export function extractShareHtml(
  html: string,
  sourceUrl: string,
): ImportedConversation {
  const roots: unknown[] = [];
  // Legacy Next.js shares.
  const legacy =
    /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(
      html,
    );
  if (legacy) {
    try {
      roots.push(JSON.parse(legacy[1]));
    } catch {
      /* Try the current format. */
    }
  }
  // Parse the quoted argument with JSON.parse, never eval or new Function.
  const chunks = html.matchAll(
    /(?:window\.)?__reactRouterContext\.streamController\.enqueue\(("(?:\\.|[^"\\])*")\)/g,
  );
  for (const match of chunks) {
    try {
      const payload: unknown = JSON.parse(JSON.parse(match[1]));
      if (Array.isArray(payload)) roots.push(decodeTable(payload));
    } catch (error) {
      if (error instanceof ImportError) throw error;
    }
  }
  const conversation = roots.map(findConversation).find(Boolean);
  if (!conversation)
    throw new ImportError(
      "会話本文を取得できませんでした。リンクの公開状態を確認してください。ChatGPT側のアクセス制限や共有ページの形式変更により、取り込めない場合もあります。",
    );
  const messages: Message[] = [];
  const warnings = new Set<string>();
  for (const node of conversationNodes(conversation)) {
    const message = object(object(node)?.message);
    if (!message) continue;
    const role = object(message.author)?.role;
    if (role !== "user" && role !== "assistant") continue;
    if (object(message.metadata)?.is_visually_hidden_from_conversation === true)
      continue;
    if (
      role === "assistant" &&
      ((message.channel != null && message.channel !== "final") ||
        (message.recipient != null && message.recipient !== "all"))
    )
      continue;
    const content = object(message.content);
    if (
      !content ||
      !["text", "multimodal_text"].includes(String(content.content_type))
    ) {
      if (
        [
          "model_editable_context",
          "reasoning_recap",
          "thoughts",
          "reasoning",
        ].includes(String(content?.content_type))
      )
        continue;
      warnings.add(
        "画像・音声・添付ファイルなど、テキスト以外の内容は取り込めません。元の会話と見比べてください。",
      );
      messages.push({
        role,
        content:
          "［テキスト以外のメッセージ：元の共有ページで確認してください］",
      });
      continue;
    }
    if (!Array.isArray(content.parts))
      throw new ImportError("会話本文の形式を読み取れませんでした。");
    const parts = content.parts.map((part) => {
      if (typeof part === "string") return part;
      warnings.add(
        "画像・音声・添付ファイルなど、テキスト以外の内容は取り込めません。元の会話と見比べてください。",
      );
      return "［画像・添付ファイル：元の共有ページで確認してください］";
    });
    const text = parts.join("\n\n");
    if (text.trim()) messages.push({ role, content: text });
    if (object(message.metadata)?.attachments)
      warnings.add(
        "添付ファイル自体は保存されません。本文に必要な内容が含まれているか確認してください。",
      );
  }
  if (
    messages.length < 2 ||
    messages[0].role !== "user" ||
    !messages.some((m) => m.role === "assistant")
  )
    throw new ImportError("共有ページに投稿可能な対話が見つかりませんでした。");
  if (messages.some((m, i) => i > 0 && m.role === messages[i - 1].role))
    throw new ImportError(
      "連続した同じ話者のメッセージがあります。自動で省略せず取り込みを中止しました。本文をコピーして整えてください。",
    );
  if (messages.reduce((n, m) => n + m.content.length, 0) > 100000)
    throw new ImportError(
      "本文が10万文字を超えています。会話を分けて投稿してください。全文を省略せず取り込むための上限です。",
    );
  return {
    title:
      typeof conversation.title === "string"
        ? conversation.title
        : "ChatGPTとの会話",
    messages,
    sourceUrl: normalizeShareUrl(sourceUrl),
    warnings: [...warnings],
  };
}
export async function importShare(
  input: string,
  fetcher: typeof fetch = fetch,
): Promise<ImportedConversation> {
  const url = normalizeShareUrl(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetcher(url, {
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "text/html" },
    });
    if (response.status === 404 || response.status === 410)
      throw new ImportError(
        "共有リンクが見つかりません。削除されていないか確認してください。",
      );
    if (!response.ok)
      throw new ImportError(
        "ChatGPT側から共有ページを取得できませんでした。時間をおいて再試行するか、本文をコピーして入力してください。",
      );
    if (!response.headers.get("content-type")?.includes("text/html"))
      throw new ImportError("共有ページの応答形式を読み取れませんでした。");
    if (Number(response.headers.get("content-length")) > MAX_HTML_BYTES)
      throw new ImportError("共有ページが大きすぎます。会話を分けてください。");
    const reader = response.body?.getReader();
    if (!reader) throw new ImportError("共有ページが空でした。");
    const decoder = new TextDecoder();
    let html = "";
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_HTML_BYTES)
          throw new ImportError(
            "共有ページが大きすぎます。会話を分けてください。",
          );
        html += decoder.decode(value, { stream: true });
      }
      html += decoder.decode();
    } finally {
      await reader.cancel().catch(() => {});
    }
    return extractShareHtml(html, url);
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError(
      controller.signal.aborted
        ? "取得に時間がかかっています。時間をおいて再試行してください。"
        : "共有ページに接続できませんでした。本文をコピーして入力することもできます。",
    );
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
