import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { configured, supabase } from "@/lib/supabase";
import { LoginButtons } from "@/components/login";
import { redirect } from "next/navigation";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const db = await supabase();
  if (db && (await db.auth.getUser()).data.user) redirect("/submit");
  return (
    <main className="login-page">
      <div className="login-card">
        <MessagesSquare size={36} />
        <span className="eyebrow">WELCOME TO DIALOGUE</span>
        <h1>
          あなたの問いを、
          <br />
          誰かのきっかけに。
        </h1>
        <p>
          ログインして、AIとの会話を公開しましょう。
          <br />
          本名を使わずに投稿できます。
        </p>
        {(await searchParams).error && (
          <p role="alert" className="error">
            認証が完了しませんでした。もう一度お試しください。
          </p>
        )}
        <p className="field-help">
          Googleログインでアカウントを作成します。
          <Link href="/terms">利用規約</Link>と
          <Link href="/privacy">プライバシーポリシー</Link>
          をご確認のうえ、同意してログインしてください。
        </p>
        {configured ? (
          <LoginButtons />
        ) : (
          <div className="notice">
            現在はサンプル閲覧モードです。ログイン・投稿を有効にするには、運営者によるSupabaseの接続設定が必要です。
          </div>
        )}
        <Link className="back-link" href="/">
          まずは会話を読んでみる →
        </Link>
      </div>
    </main>
  );
}
