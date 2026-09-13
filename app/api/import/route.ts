import { ImportError, importShare } from "@/lib/share-import";
import { configured, supabase } from "@/lib/supabase";
export const runtime = "nodejs";
export const maxDuration = 20;
// Local, per-instance guard. Production also requires a verified user.
const recent = new Map<string, number[]>();
let active = 0;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "このサイトの投稿フォームから実行してください。" },
      { status: 403, headers },
    );
  if (!configured)
    return Response.json(
      {
        error: "投稿機能は準備中です。運営者によるSupabase接続設定が必要です。",
      },
      { status: 503, headers },
    );
  const db = await supabase();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!user)
    return Response.json(
      { error: "取り込むにはログインしてください。" },
      { status: 401, headers },
    );
  const identity = user.id;
  const now = Date.now();
  for (const [key, times] of recent)
    if (times.every((t) => now - t >= 60000)) recent.delete(key);
  const times = (recent.get(identity) ?? []).filter((t) => now - t < 60000);
  if (times.length >= 10 || active >= 3)
    return Response.json(
      {
        error: "取り込みが混み合っています。1分ほど待って再試行してください。",
      },
      { status: 429, headers },
    );
  recent.set(identity, [...times, now]);
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 2000)
      return Response.json(
        { error: "URLが長すぎます。" },
        { status: 413, headers },
      );
    body = JSON.parse(text);
  } catch {
    return Response.json(
      { error: "共有URLを確認してください。" },
      { status: 400, headers },
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("url" in body) ||
    typeof body.url !== "string"
  )
    return Response.json(
      { error: "共有URLを入力してください。" },
      { status: 400, headers },
    );
  active++;
  try {
    return Response.json(await importShare(body.url), { headers });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ImportError
            ? error.message
            : "取り込みに失敗しました。",
      },
      { status: 422, headers },
    );
  } finally {
    active--;
  }
}
