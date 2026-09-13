import { PaidGate, PaywallSettings } from "@/components/paywall";
import { MessageContent } from "@/components/message-content";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, MessageSquare } from "lucide-react";
import { conversation, conversations } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { VisibilityForm } from "@/components/visibility-form";
import { Card } from "@/components/card";
import { Feedback } from "@/components/feedback";
import { PageEvent, ReadingTracker, TrackedLink } from "@/components/analytics";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const c = await conversation((await params).id);
  return {
    title: c?.title ?? "会話が見つかりません",
    robots: c && !c.published ? { index: false, follow: false } : undefined,
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await conversation(id);
  if (!c) notFound();
  const db = await supabase();
  const me = db ? (await db.auth.getUser()).data.user : null;
  const all = await conversations();
  const related = all
    .filter((x) => x.id !== id && x.tags.some((t) => c.tags.includes(t)))
    .slice(0, 3);
  const others = all
    .filter((x) => x.id !== id && x.user_id === c.user_id)
    .slice(0, 3);
  return (
    <main className="detail-shell">
      <PageEvent type="conversation_view" id={id} />
      {(c.free_message_count == null || me?.id === c.user_id) && (
        <ReadingTracker id={id} />
      )}
      <article className="reading">
        <Link className="back-link" href="/#explore">
          <ArrowLeft size={15} />
          会話一覧へ
        </Link>
        {!c.published && (
          <div className="demo-notice">
            非公開 — あなたにだけ表示されています。
          </div>
        )}
        {id.startsWith("sample-") && (
          <div className="demo-notice">
            体験用に作成された架空のサンプル会話です。
          </div>
        )}
        {me?.id === c.user_id && (
          <>
            {" "}
            <VisibilityForm id={id} published={c.published} />
            <PaywallSettings
              id={id}
              messages={c.messages}
              boundary={c.free_message_count}
            />
          </>
        )}
        <div className="detail-tags tags">
          {c.tags.map((t) => (
            <span key={t}># {t}</span>
          ))}
        </div>
        <h1>{c.title}</h1>
        <p className="detail-description">{c.description}</p>
        <div className="detail-meta">
          <TrackedLink
            className="author-small"
            href={`/users/${c.users.username}`}
            event="author_profile_click"
            conversationId={id}
          >
            <span className="avatar">
              {c.users.display_name[0].toUpperCase()}
            </span>
            {c.users.display_name}
          </TrackedLink>
          <time>
            {new Date(c.created_at).toLocaleDateString("ja-JP", {
              timeZone: "Asia/Tokyo",
            })}
          </time>
          <span className="llm">
            <span />
            {c.llm}
          </span>
          <span>
            <MessageSquare size={14} />
            {c.total_message_count ?? c.messages.length} メッセージ
          </span>
          <span>
            <Clock3 size={14} />約{c.estimated_reading_minutes}分
          </span>
        </div>
        {c.summary.length > 0 && (
          <section className="summary">
            <span className="eyebrow">BEFORE YOU READ</span>
            <h2>この会話で考えたこと</h2>
            <ul>
              {c.summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        )}
        <div className="conversation-body">
          {c.messages.map((m, i) => (
            <section className={`message ${m.role}`} key={i}>
              {i === c.free_message_count && (
                <p className="paid-divider">
                  ここから有料 · 投稿者として全文を表示しています
                </p>
              )}
              <div className="message-label">
                <span className={m.role === "user" ? "human-icon" : "ai-icon"}>
                  {m.role === "user" ? "Q" : "✳"}
                </span>
                {m.role === "user" ? c.users.display_name : c.llm}
                <span>{m.role === "user" ? "問い" : "応答"}</span>
              </div>
              <MessageContent messages={c.messages} index={i} />
            </section>
          ))}
        </div>
        {c.free_message_count != null && me?.id !== c.user_id && (
          <PaidGate
            id={id}
            remaining={
              (c.total_message_count ?? c.messages.length) -
              c.free_message_count
            }
          />
        )}
        <div className="end-mark">◇</div>
        <Feedback key={id} id={id} demo={id.startsWith("sample-")} />
      </article>
      <section className="recommendations">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KEEP YOUR CURIOSITY GOING</span>
            <h2>もうひとつ、違う視点へ。</h2>
          </div>
        </div>
        <div className="card-grid">
          {related.map((x) => (
            <Card key={x.id} conversation={x} related />
          ))}
        </div>
        {related.length === 0 && (
          <p className="muted">関連する会話はまだありません。</p>
        )}
        <h2 className="author-more">{c.users.display_name} のほかの会話</h2>
        <div className="card-grid">
          {others.map((x) => (
            <Card key={x.id} conversation={x} related />
          ))}
        </div>
        {others.length === 0 && (
          <p className="muted">この著者のほかの公開会話はまだありません。</p>
        )}
      </section>
    </main>
  );
}
