"use client";
import { useState } from "react";
import { ArrowDown, Search, X } from "lucide-react";
import { Card } from "./card";
import type { Conversation } from "@/lib/types";
const categories = [
  "すべて",
  "AI・テック",
  "キャリア",
  "個人開発",
  "生き方",
  "アイデア",
  "デザイン",
  "学び",
];
export function Explore({ conversations }: { conversations: Conversation[] }) {
  const [category, setCategory] = useState("すべて");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(9);
  const filtered = conversations.filter(
    (c) =>
      (category === "すべて" || c.tags.includes(category)) &&
      `${c.title} ${c.description} ${c.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section id="explore" className="explore">
      <div className="section-heading">
        <div>
          <span className="eyebrow">EXPLORE CONVERSATIONS</span>
          <h2>気になる問いから、読んでみる。</h2>
        </div>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="会話を検索"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(9);
            }}
            placeholder="タイトルやキーワードで検索"
          />
          {query && (
            <button aria-label="検索をクリア" onClick={() => setQuery("")}>
              <X size={14} />
            </button>
          )}
        </label>
      </div>
      <div className="filter-row">
        <div className="filters">
          {categories.map((t) => (
            <button
              key={t}
              className={category === t ? "active" : ""}
              aria-pressed={category === t}
              onClick={() => {
                setCategory(t);
                setLimit(9);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="sort">
          <ArrowDown size={13} />
          新着順
        </span>
      </div>
      <div className="result-count" aria-live="polite">
        {filtered.length} 件のConversation
      </div>
      <div className="card-grid">
        {filtered.slice(0, limit).map((c) => (
          <Card key={c.id} conversation={c} />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty">
          <h3>会話が見つかりませんでした</h3>
          <p>キーワードやタグを変えて探してみてください。</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setCategory("すべて");
            }}
          >
            すべての会話を見る
          </button>
        </div>
      )}
      {filtered.length > limit && (
        <div className="load-more">
          <button
            className="button secondary"
            onClick={() => setLimit(limit + 9)}
          >
            もっと会話を読む <ArrowDown size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
