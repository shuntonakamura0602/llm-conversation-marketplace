import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SubmitForm } from "@/components/submit-form";
import { redirect } from "next/navigation";
export default async function Submit() {
  const db = await supabase();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!user) redirect("/login");
  const { data: profile } = await db!
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single();
  return (
    <main className="page-narrow">
      <span className="eyebrow">SHARE A CONVERSATION</span>
      <h1>あなたの対話を、読み物に。</h1>
      <p className="intro">
        考えた過程も、迷った言葉も。誰かにとって新しい視点になります。
      </p>
      {profile && (
        <Link className="back-link" href={`/users/${profile.username}`}>
          プロフィール・非公開の会話を見る →
        </Link>
      )}
      <SubmitForm />
    </main>
  );
}
