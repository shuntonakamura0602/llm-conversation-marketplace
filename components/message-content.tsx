import { MarkdownContent } from "@/components/markdown-content";
import type { Message } from "@/lib/types";
export function MessageContent({
  messages,
  index,
}: {
  messages: Message[];
  index: number;
}) {
  const total = messages.reduce((sum, m) => sum + m.content.length, 0);
  const start = messages
    .slice(0, index)
    .reduce((sum, m) => sum + m.content.length, 0);
  const content = messages[index].content;
  const markers = [25, 50, 75, 100]
    .map((percent) => ({
      percent,
      offset: Math.ceil((total * percent) / 100) - start,
    }))
    .filter((m) => m.offset > 0 && m.offset <= content.length);
  return <MarkdownContent content={content} markers={markers} />;
}
