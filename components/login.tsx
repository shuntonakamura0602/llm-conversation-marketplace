"use client";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";
export function LoginButtons() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="button google-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const { error } = await browserSupabase().auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${location.origin}/auth/callback` },
            });
            if (error) throw error;
          } catch {
            setError(
              "ログインを開始できませんでした。時間をおいて再試行してください。",
            );
            setBusy(false);
          }
        }}
      >
        <span className="google-g">G</span>
        {busy ? "接続中…" : "Googleでログイン"}
      </button>
      <p role="alert">{error}</p>
    </>
  );
}
