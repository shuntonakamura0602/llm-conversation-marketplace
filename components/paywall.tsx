"use client";
import { useActionState, useState } from "react";
import type { Message } from "@/lib/types";
import { setPaywall } from "@/app/submit/actions";
import { track } from "./analytics";

export function PaywallFields({
  messages,
  initial = "",
}: {
  messages: Message[];
  initial?: string;
}) {
  return (
    <div className="paywall-settings">
      <label>
        無料で読める範囲
        <select name="free_message_count" defaultValue={initial}>
          <option value="">全文を無料にする</option>
          {messages.slice(2).map((m, i) => (
            <option value={i + 2} key={i}>
              {i + 2}件目まで無料 ／ {i + 3}件目「{m.content.slice(0, 35)}
              …」から有料
            </option>
          ))}
        </select>
      </label>
      <p className="field-help">
        最初の2メッセージ以上を無料にできます。有料部分は投稿者だけが閲覧できます。現在はβ版のため、購入・決済はまだできません。タイトル・説明・論点は公開されます。
      </p>
    </div>
  );
}
export function PaywallSettings({
  id,
  messages,
  boundary,
}: {
  id: string;
  messages: Message[];
  boundary?: number | null;
}) {
  const [state, action, pending] = useActionState(setPaywall, {
    error: "",
    success: "",
  });
  return (
    <details className="paywall-settings">
      <summary>無料・有料の区切りを編集</summary>
      <form action={action} className="form-stack">
        <input type="hidden" name="id" value={id} />
        <PaywallFields
          key={boundary ?? "free"}
          messages={messages}
          initial={boundary?.toString() ?? ""}
        />
        <button className="button" disabled={pending}>
          {pending ? "保存中…" : "区切りを保存"}
        </button>
        {state.error && (
          <p role="alert" className="error">
            {state.error}
          </p>
        )}
        {state.success && <p role="status">{state.success}</p>}
      </form>
    </details>
  );
}
export function PaidGate({ id, remaining }: { id: string; remaining: number }) {
  const [interested, setInterested] = useState(false);
  return (
    <section className="paid-gate">
      <span className="eyebrow">ここから有料</span>
      <h2>この問いの、続きを読む。</h2>
      <p>残り{remaining}メッセージは有料部分です。</p>
      <p>β版・課金準備中のため、現在は購入できません。</p>
      <button
        type="button"
        className="button"
        disabled={interested}
        onClick={() => {
          track("feedback_click", id, { feedback: "pay_yes" });
          setInterested(true);
        }}
      >
        {interested
          ? "ご意見ありがとうございます"
          : "30円で読めるようになったら読みたい"}
      </button>
      {interested && (
        <p role="status">購入希望として記録しました。料金は発生しません。</p>
      )}
    </section>
  );
}
