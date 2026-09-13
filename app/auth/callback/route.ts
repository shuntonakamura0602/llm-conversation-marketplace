import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const db = await supabase();
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/submit", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
