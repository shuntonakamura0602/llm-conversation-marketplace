"use client";
import { MarkdownContent } from "@/components/markdown-content";
import { useState } from "react";
import { Download, Link2 } from "lucide-react";
import type { ImportedConversation } from "@/lib/share-import";
import { readingMinutes } from "@/lib/parser";
export function ShareImporter({
  onApply,
}: {
  onApply: (conversation: ImportedConversation) => void;
}) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportedConversation | null>(null);
  async function retrieve(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "取り込みに失敗しました。");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "接続できませんでした。");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="share-importer">
      <span className="eyebrow">IMPORT YOUR CONVERSATION</span>
      <h2>
        <Link2 size={20} />
        共有URLから取り込む
      </h2>
      <p>
        ChatGPTの共有URLを貼ると、タイトルと会話本文を読み込みます。取り込みだけで公開されることはありません。
      </p>
      <form onSubmit={retrieve} className="import-url-form">
        <label htmlFor="share-url">
          ChatGPTの共有URL
          <input
            id="share-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://chatgpt.com/share/…"
            maxLength={1000}
            required
            disabled={pending}
          />
        </label>
        <button className="button" disabled={pending}>
          <Download size={16} />
          {pending ? "取得しています…" : "会話を取り込む"}
        </button>
      </form>
      <p className="field-help import-help">
        現在はChatGPTの公開共有リンクに対応しています。画像・添付ファイルは取り込めません。
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {pending && <p role="status">長い会話は取得に少し時間がかかります。</p>}
      {result && (
        <div className="import-result">
          <h3>{result.title}</h3>
          <p role="status">
            {result.messages.length} メッセージ ·{" "}
            {result.messages
              .reduce((n, m) => n + m.content.length, 0)
              .toLocaleString()}
            文字 · 約{readingMinutes(result.messages)}分
          </p>
          {result.warnings.map((w) => (
            <p className="notice" key={w}>
              {w}
            </p>
          ))}
          <details>
            <summary>取り込んだ全文を確認する</summary>
            <div className="import-transcript">
              {result.messages.map((m, i) => (
                <section className={`message ${m.role}`} key={i}>
                  <strong>{m.role === "user" ? "You" : "ChatGPT"}</strong>
                  <MarkdownContent content={m.content} />
                </section>
              ))}
            </div>
          </details>
          <p>
            フォームのタイトル・説明・LLM・本文をこの会話に置き換えます。説明には最初の質問を仮入力します。タグはそのまま残ります。
          </p>
          <div className="import-result-actions">
            <button
              className="button"
              type="button"
              onClick={() => {
                onApply(result);
                setResult(null);
              }}
            >
              この会話をフォームに反映
            </button>
            <button
              type="button"
              className="muted-button"
              onClick={() => setResult(null)}
            >
              取り消す
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
