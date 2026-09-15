"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/submit/actions";
import type { Author } from "@/lib/types";
export function ProfileForm({ profile }: { profile: Author }) {
  const [state, action, pending] = useActionState(updateProfile, {
    error: "",
    success: "",
  });
  return (
    <details className="profile-edit" id="profile-edit" open>
      <summary>投稿者名・プロフィールを変更</summary>
      <form action={action} className="form-stack">
        <label>
          投稿者名（表示名）
          <input
            name="display_name"
            defaultValue={profile.display_name}
            required
            maxLength={50}
            autoComplete="nickname"
            aria-describedby="display-name-help"
          />
        </label>
        <p className="field-help" id="display-name-help">
          会話の投稿者名として表示されます。ニックネームで構いません（50文字以内）。変更は過去の投稿にも反映されます。
        </p>
        <label>
          自己紹介
          <textarea name="bio" defaultValue={profile.bio} maxLength={500} />
        </label>
        <label>
          プロフィール属性
          <input
            name="attributes"
            defaultValue={profile.attributes}
            maxLength={150}
            placeholder="日本 / Software Engineer"
          />
        </label>
        <button className="button" disabled={pending}>
          {pending ? "保存中…" : "保存する"}
        </button>
        <p role="status">{state.error || state.success}</p>
      </form>
    </details>
  );
}
