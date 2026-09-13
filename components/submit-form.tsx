"use client";
import { useActionState, useState } from "react";
import { Eye, Send, ShieldCheck } from "lucide-react";
import { submitConversation } from "@/app/submit/actions";
import { parseMessages, readingMinutes } from "@/lib/parser";
export function SubmitForm() {
  const [state, action, pending] = useActionState(submitConversation, {
    error: "",
  });
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  let messages;
  let parseError = "";
  try {
    messages = parseMessages(body);
  } catch (e) {
    parseError = e instanceof Error ? e.message : "";
  }
  return (
    <form action={action} className="form-stack submit-form">
      <label>
        タイトル <span>必須</span>
        <input
          name="title"
          placeholder="この会話から、どんな問いが生まれましたか？"
          maxLength={120}
          required
        />
      </label>
      <label>
        短い説明 <span>必須</span>
        <textarea
          name="description"
          placeholder="読む人に向けて、会話の背景やおもしろさを伝えましょう。"
          maxLength={500}
          required
          rows={3}
        />
      </label>
      <div className="form-columns">
        <label>
          使用したLLM
          <select name="llm">
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
        name="body"
        className={preview ? "hidden" : "body-input"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
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
                <div className="message-content">{m.content}</div>
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
            <input type="checkbox" name="privacy" required />
            内容を確認し、公開する権利があることを確認しました。
          </label>
        </div>
      </div>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button submit-button" disabled={pending || !messages}>
        <Send size={17} />
        {pending ? "保存しています…" : "会話を保存する"}
      </button>
    </form>
  );
}
