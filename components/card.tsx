import { ArrowUpRight, Clock3, Eye, MessageSquare } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { TrackedLink } from "./analytics";
export function Card({
  conversation: c,
  related = false,
}: {
  conversation: Conversation;
  related?: boolean;
}) {
  return (
    <article className="conversation-card">
      <div className="card-top">
        <span className={`llm ${c.llm === "Claude" ? "claude" : ""}`}>
          <span />
          {c.llm}
        </span>
        <span className="card-date">
          {new Date(c.created_at).toLocaleDateString("ja-JP", {
            month: "numeric",
            day: "numeric",
            timeZone: "Asia/Tokyo",
          })}
        </span>
      </div>
      <TrackedLink
        className="card-main"
        href={`/conversations/${c.id}`}
        event={
          related ? "related_conversation_click" : "conversation_card_click"
        }
        conversationId={c.id}
      >
        <h3>
          {c.title}
          <ArrowUpRight size={18} />
        </h3>
        <p>{c.description}</p>
      </TrackedLink>
      <div className="tags">
        {c.tags.map((t) => (
          <span key={t}># {t}</span>
        ))}
      </div>
      <div className="card-bottom">
        <TrackedLink
          href={`/users/${c.users.username}`}
          event="author_profile_click"
          conversationId={c.id}
          className="author-small"
        >
          <span
            className={`avatar avatar-${c.users.username.charCodeAt(0) % 3}`}
          >
            {c.users.display_name.slice(0, 1).toUpperCase()}
          </span>
          {c.users.display_name}
        </TrackedLink>
        <div className="stats">
          <span>
            <MessageSquare size={13} />
            {c.messages.length}
          </span>
          <span>
            <Clock3 size={13} />
            {c.estimated_reading_minutes}分
          </span>
          <span>
            <Eye size={13} />
            {c.view_count}
          </span>
        </div>
      </div>
    </article>
  );
}
