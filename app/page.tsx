import Link from "next/link";
import { ArrowRight, Sparkles, MoveUpRight } from "lucide-react";
import { conversations } from "@/lib/data";
import { configured } from "@/lib/supabase";
import { Explore } from "@/components/explore";
import { PageEvent } from "@/components/analytics";
export const dynamic = "force-dynamic";
export default async function Home() {
  const items = await conversations();
  return (
    <main className="home">
      <PageEvent type="page_view" />
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-label">
            <span /> THOUGHTS WORTH SHARING
          </div>
          <h1>
            他人がAIと
            <br />
            考えたことを<span className="accent">読む。</span>
          </h1>
          <p>
            ひとりの問いから生まれた、まだ知らない視点。
            <br />
            ChatGPTやClaudeとの会話を、ひとつの読み物に。
          </p>
          <a className="button" href="#explore">
            会話を探してみる <ArrowRight size={17} />
          </a>
          <span className="hero-note">読むだけなら、登録はいりません。</span>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="art-spark">
            <Sparkles size={25} />
          </span>
          <div className="floating-question">
            <span className="art-label">HUMAN · ひとつの問い</span>
            <p>
              正解がない問いを、
              <br />
              誰かと考えてみたかった。
            </p>
            <div className="question-dot">?</div>
          </div>
          <div className="floating-answer">
            <span className="art-label">AI · もうひとつの視点</span>
            <p>
              では、少し違う角度から
              <br />
              眺めてみませんか。
            </p>
            <div className="art-lines">
              <i />
              <i />
              <i />
            </div>
            <span className="art-arrow">
              <MoveUpRight size={20} />
            </span>
          </div>
          <span className="art-caption">
            A conversation. A different perspective.
          </span>
        </div>
      </section>
      <div className="editorial-note">
        <span className="note-mark">“</span>
        <p>
          答えだけじゃない。<strong>そこに至るまでの対話</strong>がおもしろい。
        </p>
        <span className="note-label">READ THE THINKING.</span>
      </div>
      {!configured && (
        <p className="demo-notice">
          サンプル公開中 — 掲載中の20件は体験用に作成した架空の会話です。
        </p>
      )}
      <Explore conversations={items} />
      <section className="share-banner">
        <div>
          <span className="eyebrow">YOUR THOUGHTS MATTER</span>
          <h2>その会話、誰かのヒントになるかも。</h2>
          <p>AIと考えたことを、あなたの言葉で届けてみませんか。</p>
        </div>
        <Link className="button secondary" href="/submit">
          会話を投稿する <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
