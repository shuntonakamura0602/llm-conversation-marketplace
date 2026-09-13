"use client";
import { useActionState } from "react";
import { setVisibility } from "@/app/submit/actions";
export function VisibilityForm({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const [state, action, pending] = useActionState(setVisibility, { error: "" });
  return (
    <form action={action} className="visibility-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="published" value={String(!published)} />
      <span>{published ? "公開中" : "非公開"} · あなたの会話</span>
      <button className="button secondary small" disabled={pending}>
        {pending ? "変更中…" : published ? "非公開にする" : "公開する"}
      </button>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
    </form>
  );
}
