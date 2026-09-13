"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty page-narrow">
      <h1>読み込みに失敗しました</h1>
      <p>時間をおいて再試行してください。</p>
      <button className="button" onClick={reset}>
        もう一度読み込む
      </button>
    </main>
  );
}
