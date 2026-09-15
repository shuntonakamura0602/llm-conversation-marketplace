import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default async function MyProfile() {
  const db = await supabase();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!db || !user) redirect("/login");
  const { data, error } = await db
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single();
  if (error || !data)
    throw new Error(
      "プロフィールを取得できませんでした。時間をおいて再試行してください。",
    );
  redirect(`/users/${data.username}#profile-edit`);
}
