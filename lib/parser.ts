import type { Message } from "./types.ts";
export function parseMessages(text: string): Message[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const messages: Message[] = [];
  let current: Message | undefined;
  for (const line of lines) {
    const match = /^(USER|ASSISTANT):\s*$/i.exec(line.trim());
    if (match) {
      if (current)
        messages.push({ ...current, content: current.content.trim() });
      current = {
        role: match[1].toLowerCase() as Message["role"],
        content: "",
      };
    } else if (current) current.content += line + "\n";
    else if (line.trim())
      throw new Error(
        "本文は USER: または ASSISTANT: の行から始めてください。",
      );
  }
  if (current) messages.push({ ...current, content: current.content.trim() });
  if (
    messages.length < 2 ||
    messages[0].role !== "user" ||
    !messages.some((m) => m.role === "assistant")
  )
    throw new Error("USER と ASSISTANT の会話を最低1つずつ入力してください。");
  if (messages.some((m) => !m.content))
    throw new Error("空のメッセージがあります。本文を入力してください。");
  if (messages.some((m, i) => i > 0 && m.role === messages[i - 1].role))
    throw new Error("USER と ASSISTANT を交互に入力してください。");
  return messages;
}
export function readingMinutes(messages: Message[]) {
  return Math.max(
    1,
    Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 600),
  );
}

export function validateImportedMessages(value: unknown): Message[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 10000)
    throw new Error("取り込んだ会話の形式を確認してください。");
  const messages: Message[] = value.map((item: unknown, i) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("role" in item) ||
      !("content" in item) ||
      item.role !== (i % 2 === 0 ? "user" : "assistant") ||
      typeof item.content !== "string" ||
      !item.content.trim()
    )
      throw new Error("取り込んだ会話の話者・本文を確認してください。");
    return { role: i % 2 === 0 ? "user" : "assistant", content: item.content };
  });
  if (messages.reduce((n, m) => n + m.content.length, 0) > 100000)
    throw new Error("会話本文は10万文字以内にしてください。");
  return messages;
}
