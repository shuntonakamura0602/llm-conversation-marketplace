"use server";
import { supabase } from "@/lib/supabase";
import {
  parseMessages,
  readingMinutes,
  validateImportedMessages,
} from "@/lib/parser";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
export async function submitConversation(
  _state: { error: string },
  form: FormData,
) {
  const db = await supabase();
  if (!db) return { error: "Supabaseが設定されていません。" };
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { error: "投稿するにはログインしてください。" };
  const title = String(form.get("title") ?? "").trim(),
    description = String(form.get("description") ?? "").trim(),
    body = String(form.get("body") ?? ""),
    llm = String(form.get("llm") ?? "");
  if (
    !title ||
    title.length > 120 ||
    !description ||
    description.length > 500 ||
    body.length > 100000 ||
    !["ChatGPT", "Claude", "Gemini", "その他"].includes(llm)
  )
    return { error: "タイトル・説明・本文・使用LLMを確認してください。" };
  if (form.get("privacy") !== "on")
    return { error: "公開前の確認事項に同意してください。" };
  const tags = [
    ...new Set(
      String(form.get("tags") ?? "")
        .split(/[,、\n]/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
    ),
  ];
  if (tags.length > 5 || tags.some((t) => t.length > 24))
    return { error: "タグは24文字以内で、最大5件まで入力してください。" };
  const summary = String(form.get("summary") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (summary.length > 8 || summary.some((s) => s.length > 200))
    return { error: "論点は各200文字以内で、8行まで入力してください。" };
  let messages;
  try {
    const imported = String(form.get("importedMessages") ?? "");
    if (imported.length > 500000)
      return { error: "取り込んだ会話が大きすぎます。会話を分けてください。" };
    messages = imported
      ? validateImportedMessages(JSON.parse(imported))
      : parseMessages(body);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "会話形式を確認してください。",
    };
  }
  const rawBoundary = String(form.get("free_message_count") ?? "");
  const boundary = rawBoundary === "" ? null : Number(rawBoundary);
  if (
    boundary !== null &&
    (!Number.isInteger(boundary) || boundary < 2 || boundary >= messages.length)
  )
    return { error: "無料部分の区切りを選び直してください。" };
  const content = {
    title,
    description,
    llm,
    messages,
    tags,
    summary,
    published: form.get("visibility") === "public",
    estimated_reading_minutes: readingMinutes(messages),
  };
  const result =
    boundary === null
      ? await db
          .from("conversations")
          .insert({ ...content, user_id: user.id })
          .select("id")
          .single()
      : await db.rpc("create_paid_conversation", {
          p_content: content,
          p_free_count: boundary,
        });
  const { error } = result;
  const data = boundary === null ? result.data : { id: result.data };
  if (error)
    return {
      error:
        "保存できませんでした。接続状態とデータベース設定を確認してください。入力内容はそのまま再送できます。",
    };
  revalidatePath("/");
  redirect(`/conversations/${data.id}`);
}
export async function signOut() {
  const db = await supabase();
  if (db) await db.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
export async function updateProfile(
  _state: { error: string; success: string },
  form: FormData,
) {
  const db = await supabase();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!db || !user) return { error: "ログインしてください。", success: "" };
  const display_name = String(form.get("display_name") ?? "").trim(),
    bio = String(form.get("bio") ?? "").trim(),
    attributes = String(form.get("attributes") ?? "").trim();
  if (
    !display_name ||
    display_name.length > 50 ||
    bio.length > 500 ||
    attributes.length > 150
  )
    return { error: "文字数を確認してください。", success: "" };
  const { error } = await db
    .from("users")
    .update({ display_name, bio, attributes })
    .eq("id", user.id)
    .select("username")
    .single();
  if (error) return { error: "保存できませんでした。", success: "" };
  revalidatePath("/", "layout");
  return { error: "", success: "プロフィールを保存しました。" };
}
export async function setVisibility(_state: { error: string }, form: FormData) {
  const db = await supabase();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!db || !user) return { error: "ログインしてください。" };
  const id = String(form.get("id") ?? "");
  const published = form.get("published") === "true";
  const { data, error } = await db
    .from("conversations")
    .update({ published })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "公開設定を変更できませんでした。" };
  revalidatePath(`/conversations/${id}`);
  revalidatePath("/");
  revalidatePath("/users", "layout");
  return { error: "" };
}

export async function setPaywall(
  _state: { error: string; success: string },
  form: FormData,
) {
  const db = await supabase();
  if (!db || !(await db.auth.getUser()).data.user)
    return { error: "ログインしてください。", success: "" };
  const id = String(form.get("id") ?? "");
  const raw = String(form.get("free_message_count") ?? "");
  const boundary = raw === "" ? null : Number(raw);
  if (boundary !== null && (!Number.isInteger(boundary) || boundary < 2))
    return { error: "区切りを確認してください。", success: "" };
  const { error } = await db.rpc("set_conversation_paywall", {
    p_id: id,
    p_free_count: boundary,
  });
  if (error)
    return {
      error:
        "保存できませんでした。有料部分用のSQLが適用済みか確認し、再試行してください。",
      success: "",
    };
  revalidatePath("/", "layout");
  return { error: "", success: "無料・有料の区切りを保存しました。" };
}

export async function deleteConversation(
  _state: { error: string },
  form: FormData,
) {
  const db = await supabase();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!db || !user) return { error: "削除するにはログインしてください。" };
  const id = String(form.get("id") ?? "");
  const { data, error } = await db
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return {
      error: "削除できませんでした。自分の投稿か、接続状態を確認してください。",
    };
  revalidatePath("/", "layout");
  redirect("/");
}
