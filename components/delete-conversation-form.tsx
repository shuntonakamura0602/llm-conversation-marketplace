"use client";
import { useActionState, useState } from "react";
import { deleteConversation } from "@/app/submit/actions";
export function DeleteConversationForm({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteConversation, {
    error: "",
  });
  return (
    <div className="delete-conversation">
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)}>
          この会話を削除
        </button>
      ) : (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <p>
            この会話を削除しますか？有料部分も含めて削除され、元に戻せません。
          </p>
          <button type="submit" disabled={pending}>
            {pending ? "削除中…" : "削除する"}
          </button>{" "}
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            キャンセル
          </button>
          {state.error && <p role="alert">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
