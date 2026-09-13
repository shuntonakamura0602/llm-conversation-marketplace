import { Fragment } from "react";
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
  let previous = 0;
  const parts = markers.map(({ percent, offset }) => {
    const text = content.slice(previous, offset);
    previous = offset;
    return (
      <Fragment key={percent}>
        {text}
        <span
          className="reading-marker"
          data-reading-marker={percent}
          aria-hidden="true"
        />
      </Fragment>
    );
  });
  return (
    <div className="message-content">
      {parts}
      {content.slice(previous)}
    </div>
  );
}
