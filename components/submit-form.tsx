"use client";
import { MarkdownContent } from "@/components/markdown-content";
import { useActionState, useState } from "react";
import { Eye, Send, ShieldCheck } from "lucide-react";
import { submitConversation } from "@/app/submit/actions";
import { parseMessages, readingMinutes } from "@/lib/parser";
import { PaywallFields } from "./paywall";
import { ShareImporter } from "./share-importer";
import type { Message } from "@/lib/types";
export function SubmitForm() {
  const [state, action, pending] = useActionState(submitConversation, {
    error: "",
  });
  const [importRevision, setImportRevision] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [llm, setLlm] = useState("ChatGPT");
  const [importedMessages, setImportedMessages] = useState<Message[] | null>(
    null,
  );
  const [sourceUrl, setSourceUrl] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  let messages;
  let parseError = "";
  try {
    messages = importedMessages ?? parseMessages(body);
  } catch (e) {
    parseError = e instanceof Error ? e.message : "";
  }
  return (
    <>
      <ShareImporter
        onApply={(conversation) => {
          setImportRevision((value) => value + 1);
          setTitle(conversation.title.slice(0, 120));
          setDescription(conversation.messages[0].content.slice(0, 500));
          setLlm("ChatGPT");
          setImportedMessages(conversation.messages);
          setBody(
            conversation.messages
              .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
              .join("\n\n"),
          );
          setSourceUrl(conversation.sourceUrl);
          setPreview(true);
          setImportNotice(
            "会話を反映しました。説明には最初の質問を仮入力しています。内容を確認し、そのまま公開することも編集することもできます。",
          );
        }}
      />
      <form action={action} className="form-stack submit-form">
        <input
          type="hidden"
          name="importedMessages"
          value={importedMessages ? JSON.stringify(importedMessages) : ""}
        />
        {importNotice && (
          <p role="status" className="success">
            {importNotice}
          </p>
        )}
        {sourceUrl && (
          <a
            className="back-link"
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            元の共有ページと見比べる ↗
          </a>
        )}
        <label>
          タイトル <span>必須</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="この会話から、どんな問いが生まれましたか？"
            maxLength={120}
            required
          />
        </label>
        <label>
          短い説明 <span>必須</span>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="読む人に向けて、会話の背景やおもしろさを伝えましょう。"
            maxLength={500}
            required
            rows={3}
          />
        </label>
        <div className="form-columns">
          <label>
            使用したLLM
            <select
              name="llm"
              value={llm}
              onChange={(e) => setLlm(e.target.value)}
            >
              {["ChatGPT", "Claude", "Gemini", "その他"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            タグ <span>最大5つ</span>
            <input
              name="tags"
              maxLength={124}
              placeholder="AI・テック, キャリア, 思考の整理"
            />
          </label>
        </div>
        <label>
          主な論点 <span>任意・1行に1つ</span>
          <textarea
            name="summary"
            maxLength={1608}
            rows={3}
            placeholder={"組織に所属するメリット\n安定と自由のトレードオフ"}
          />
        </label>
        <div className="body-label">
          <label htmlFor="conversation-body">
            会話本文 <span>必須</span>
          </label>
          <button
            type="button"
            className="muted-button"
            onClick={() => setPreview(!preview)}
          >
            <Eye size={15} />
            {preview ? "入力に戻る" : "プレビュー"}
          </button>
        </div>
        <p className="field-help">
          USER: と ASSISTANT:
          をそれぞれ独立した行に書き、交互に本文を入力してください。ラベルと同じ行に本文は書かないでください。
        </p>
        <textarea
          id="conversation-body"
          name={importedMessages ? undefined : "body"}
          className={preview ? "hidden" : "body-input"}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setImportedMessages(null);
          }}
          maxLength={100000}
          placeholder={
            "USER:\nAI時代に会社員でいる意味についてどう思いますか？\n\nASSISTANT:\nいくつかの視点から考えてみましょう。"
          }
          rows={14}
        />
        {preview && (
          <div className="preview">
            {parseError ? (
              <p className="error">{parseError}</p>
            ) : (
              messages?.map((m, i) => (
                <section className={`message ${m.role}`} key={i}>
                  <strong>{m.role === "user" ? "You" : "Assistant"}</strong>
                  <MarkdownContent content={m.content} />
                </section>
              ))
            )}
          </div>
        )}
        {messages && (
          <p className="field-help">
            {messages.length} メッセージ · 約{readingMinutes(messages)}
            分で読めます
          </p>
        )}
        {messages && (
          <PaywallFields
            key={`${importRevision}-${body}`}
            messages={messages}
          />
        )}
        <label>
          公開設定
          <select name="visibility">
            <option value="public">公開する — すべての人が閲覧できます</option>
            <option value="private">非公開 — 自分だけが閲覧できます</option>
          </select>
        </label>
        <div className="privacy-notice">
          <ShieldCheck size={22} />
          <div>
            <strong>公開前に、内容を確認してください</strong>
            <p>
              氏名・会社名・メールアドレス・APIキーなどが含まれていないかご確認ください。個人情報、第三者のプライバシー情報、会社の機密情報、APIキー、パスワード、有料コンテンツの転載などを含む会話を投稿しないでください。
            </p>
            <label className="checkbox-label">
              <input
                key={importRevision}
                type="checkbox"
                name="privacy"
                required
              />
              内容を確認し、公開する権利があることを確認しました。
            </label>
          </div>
        </div>
        {state.error && (
          <p className="error" role="alert">
            {state.error}
          </p>
        )}
        <button
          className="button submit-button"
          disabled={pending || !messages}
        >
          <Send size={17} />
          {pending ? "保存しています…" : "会話を保存する"}
        </button>
      </form>
    </>
  );
}
