import { supabase } from "@/lib/supabase";
const events = new Set([
  "page_view",
  "conversation_card_click",
  "conversation_view",
  "conversation_read_25",
  "conversation_read_50",
  "conversation_read_75",
  "conversation_read_100",
  "related_conversation_click",
  "author_profile_click",
  "feedback_click",
]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const text = await request.text();
  if (text.length > 4000) return new Response(null, { status: 413 });
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    !body ||
    !events.has(body.event_type) ||
    !uuid.test(body.anonymous_id) ||
    !uuid.test(body.session_id) ||
    (body.conversation_id && !uuid.test(body.conversation_id))
  )
    return new Response(null, { status: 400 });
  const db = await supabase();
  if (!db) return new Response(null, { status: 503 });
  const { error } = await db.rpc("record_event", {
    p_anonymous_id: body.anonymous_id,
    p_session_id: body.session_id,
    p_conversation_id: body.conversation_id || null,
    p_event_type: body.event_type,
    p_metadata:
      body.event_type === "feedback_click"
        ? { feedback: String(body.metadata?.feedback || "").slice(0, 40) }
        : {},
  });
  return new Response(null, { status: error ? 400 : 204 });
}
