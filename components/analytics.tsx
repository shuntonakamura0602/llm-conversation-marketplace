"use client";
import { useEffect } from "react";
import Link from "next/link";
import type { ComponentProps } from "react";
export function track(
  event_type: string,
  conversation_id?: string,
  metadata: Record<string, string | number> = {},
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  try {
    let anonymous_id = localStorage.getItem("dialogue-anonymous");
    if (!anonymous_id) {
      anonymous_id = crypto.randomUUID();
      localStorage.setItem("dialogue-anonymous", anonymous_id);
    }
    let session_id = sessionStorage.getItem("dialogue-session");
    const last = Number(sessionStorage.getItem("dialogue-last") || 0);
    if (!session_id || Date.now() - last > 1800000) {
      session_id = crypto.randomUUID();
      sessionStorage.setItem("dialogue-session", session_id);
    }
    sessionStorage.setItem("dialogue-last", String(Date.now()));
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type,
        conversation_id,
        anonymous_id,
        session_id,
        metadata,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Storage may be unavailable; reading remains possible. */
  }
}
export function TrackedLink({
  event,
  conversationId,
  ...props
}: ComponentProps<typeof Link> & { event: string; conversationId?: string }) {
  return <Link {...props} onClick={() => track(event, conversationId)} />;
}
export function PageEvent({ type, id }: { type: string; id?: string }) {
  useEffect(() => {
    track(type, id);
  }, [type, id]);
  return null;
}
export function ReadingTracker({ id }: { id: string }) {
  useEffect(() => {
    const seen = new Set<number>();
    const elements = document.querySelectorAll("[data-reading-marker]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting && document.visibilityState === "visible") {
            const value = Number(
              (entry.target as HTMLElement).dataset.readingMarker,
            );
            if (!seen.has(value)) {
              seen.add(value);
              track(`conversation_read_${value}`, id);
            }
          }
      },
      { threshold: 0.5 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [id]);
  return null;
}
