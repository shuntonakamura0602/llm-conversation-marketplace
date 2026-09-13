import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const text = await request.text();
  if (text.length > 5000) return new Response(null, { status: 413 });
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    !body ||
    !["個人情報", "著作権", "誹謗中傷", "Spam", "その他"].includes(
      body.reason,
    ) ||
    typeof body.details !== "string" ||
    body.details.length > 2000 ||
    typeof body.conversation_id !== "string"
  )
    return new Response(null, { status: 400 });
  const db = await supabase();
  if (!db) return new Response(null, { status: 503 });
  const { error } = await db.rpc("report_conversation", {
    p_conversation_id: body.conversation_id,
    p_reason: body.reason,
    p_details: body.details,
  });
  return new Response(null, { status: error ? 400 : 204 });
}
