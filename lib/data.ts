import { supabase } from "./supabase";
import { samples } from "./samples";
import type { Author, Conversation } from "./types";
export async function conversations(): Promise<Conversation[]> {
  const db = await supabase();
  if (!db) return samples;
  const { data, error } = await db
    .from("conversations")
    .select("*, users(*)")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    throw new Error(
      "会話を取得できませんでした。しばらくしてから再試行してください。",
    );
  return data as unknown as Conversation[];
}
export async function conversation(id: string): Promise<Conversation | null> {
  const db = await supabase();
  if (!db) return samples.find((c) => c.id === id) ?? null;
  const { data, error } = await db
    .from("conversations")
    .select("*, users(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    throw new Error("会話を取得できませんでした。");
  }
  return data as unknown as Conversation | null;
}
export async function author(username: string): Promise<Author | null> {
  const db = await supabase();
  if (!db)
    return samples.find((c) => c.users.username === username)?.users ?? null;
  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error("プロフィールを取得できませんでした。");
  return data;
}
