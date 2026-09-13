"use client";
import { useState } from "react";
import { ThumbsUp, Bookmark, Sparkles, Flag } from "lucide-react";
import { track } from "./analytics";
export function Feedback({ id, demo }: { id: string; demo: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [report, setReport] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const options = [
    ["interesting", "面白かった", ThumbsUp],
    ["continue", "続きを読みたい", Bookmark],
    ["more", "もっと読みたい", Sparkles],
  ] as const;
  function feedback(value: string) {
    if (selected.includes(value)) return;
    setSelected([...selected, value]);
    track("feedback_click", id, { feedback: value });
  }
  return (
    <>
      <section className="feedback">
        <span className="eyebrow">THANK YOU FOR READING</span>
        <h2>この対話、どうでしたか？</h2>
        <p>あなたの反応が、次の会話につながります。</p>
        <div className="feedback-buttons">
          {options.map(([value, label, Icon]) => (
            <button
              key={value}
              aria-pressed={selected.includes(value)}
              onClick={() => feedback(value)}
              className={`button secondary ${selected.includes(value) ? "selected" : ""}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div aria-live="polite">
          {selected.length > 0 && (
            <p className="success">
              {demo
                ? "サンプル体験ありがとうございます。反応は保存されません。"
                : "フィードバックありがとうございます。"}
            </p>
          )}
        </div>
        <div className="willingness">
          <span>この会話に30円払う価値がありましたか？</span>
          {["yes", "no"].map((v, i) => (
            <button
              disabled={selected.some((s) => s.startsWith("pay_"))}
              key={v}
              onClick={() => feedback(`pay_${v}`)}
              className={selected.includes(`pay_${v}`) ? "selected" : ""}
            >
              {i === 0 ? "はい" : "いいえ"}
            </button>
          ))}
          <small>意向調査です。課金は発生しません。</small>
        </div>
      </section>
      <div className="report-area">
        <button onClick={() => setReport(!report)} className="muted-button">
          <Flag size={14} />
          問題を報告
        </button>
        {report && (
          <form
            className="report-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (demo) {
                setStatus("サンプルのため報告は送信されません。");
                return;
              }
              setBusy(true);
              const form = new FormData(e.currentTarget);
              try {
                const response = await fetch("/api/reports", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    conversation_id: id,
                    reason: form.get("reason"),
                    details: form.get("details"),
                  }),
                });
                if (!response.ok) throw new Error();
                setStatus("報告を受け付けました。運営者が確認します。");
              } catch {
                setStatus(
                  "送信できませんでした。時間をおいて再試行してください。",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              報告理由
              <select name="reason">
                {["個人情報", "著作権", "誹謗中傷", "Spam", "その他"].map(
                  (r) => (
                    <option key={r}>{r}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              詳細（任意）
              <textarea name="details" maxLength={2000} />
            </label>
            <button className="button small" disabled={busy}>
              {busy ? "送信中…" : "報告を送信"}
            </button>
            <p role="status">{status}</p>
          </form>
        )}
      </div>
    </>
  );
}
