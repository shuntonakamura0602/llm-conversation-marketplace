import { notFound } from "next/navigation";
import { author, conversations } from "@/lib/data";
import { Card } from "@/components/card";
import { ProfileForm } from "@/components/profile-form";
import { supabase } from "@/lib/supabase";
import type { Conversation } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Profile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const person = await author(username);
  if (!person) notFound();
  const items = (await conversations()).filter((c) => c.user_id === person.id);
  const db = await supabase();
  const me = db ? (await db.auth.getUser()).data.user : null;
  let drafts: Conversation[] = [];
  if (db && me?.id === person.id) {
    const { data, error } = await db
      .from("conversations")
      .select("*, users(*)")
      .eq("user_id", me.id)
      .eq("published", false)
      .order("created_at", { ascending: false });
    if (error) throw new Error("非公開の会話を取得できませんでした。");
    drafts = data as unknown as Conversation[];
  }
  return (
    <main className="profile-page">
      <section className="profile-heading">
        <span className="avatar large">
          {person.display_name[0].toUpperCase()}
        </span>
        <span className="eyebrow">AUTHOR</span>
        <h1>{person.display_name}</h1>
        <span className="muted">@{person.username}</span>
        <p>{person.bio || "まだ自己紹介はありません。"}</p>
        <span className="profile-attributes">{person.attributes}</span>
        {me?.id === person.id && <ProfileForm profile={person} />}
      </section>
      <h2>
        公開した会話 <span className="muted">{items.length}</span>
      </h2>
      <div className="card-grid">
        {items.map((c) => (
          <Card key={c.id} conversation={c} />
        ))}
      </div>
      {!items.length && (
        <p className="empty">公開された会話はまだありません。</p>
      )}
      {me?.id === person.id && (
        <>
          <h2 className="author-more">非公開の会話</h2>
          <div className="card-grid">
            {drafts.map((c) => (
              <Card key={c.id} conversation={c} />
            ))}
          </div>
          {!drafts.length && (
            <p className="muted">非公開の会話はありません。</p>
          )}
        </>
      )}
    </main>
  );
}
