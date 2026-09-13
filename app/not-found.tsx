import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty page-narrow">
      <span className="eyebrow">404</span>
      <h1>ページが見つかりません</h1>
      <p>削除されたか、非公開の会話かもしれません。</p>
      <Link className="button" href="/">
        会話を探す
      </Link>
    </main>
  );
}
