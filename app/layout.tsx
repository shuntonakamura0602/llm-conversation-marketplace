import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Plus, MessagesSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { signOut } from "./submit/actions";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "dialogue — 他人がAIと考えたことを読む。",
    template: "%s | dialogue",
  },
  description:
    "ChatGPTやClaudeとの価値ある会話を公開・発見できる場所。問いからはじまる、新しい読書体験。",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = await supabase();
  const user = db ? (await db.auth.getUser()).data.user : null;
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <MessagesSquare size={25} strokeWidth={1.7} />
              dialogue<span className="beta">BETA</span>
            </Link>
            <nav aria-label="メインナビゲーション">
              <Link className="discover-nav" href="/#explore">
                会話を見つける
              </Link>
              {user ? (
                <form action={signOut}>
                  <button className="login-link">ログアウト</button>
                </form>
              ) : (
                <Link className="login-link" href="/login">
                  ログイン
                </Link>
              )}
              <Link className="button small" href="/submit">
                <Plus size={16} />
                <span>会話を投稿</span>
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <Link href="/" className="brand">
              <MessagesSquare size={22} />
              dialogue
            </Link>
            <p>ひとつの問いが、誰かの視点をひらく。</p>
          </div>
          <div className="footer-right">
            <Link href="/privacy">プライバシーポリシー</Link>
            <Link href="/terms">利用規約</Link>
            <Link href="/submit">
              あなたの会話を届ける <ArrowUpRight size={15} />
            </Link>
            <span>© 2026 dialogue · 小さくはじめる、新しい読書体験</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
