import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { readingMarkers, type ReadingMarker } from "@/lib/reading-markers";

export function MarkdownContent({
  content,
  markers = [],
}: {
  content: string;
  markers?: ReadingMarker[];
}) {
  return (
    <div className="message-content markdown-content">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[readingMarkers, markers]]}
        skipHtml
        components={{
          a: ({ children, href }) => (
            <a href={href} rel="nofollow noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ alt, src }) => (
            <a
              href={typeof src === "string" ? src : undefined}
              rel="nofollow noopener noreferrer"
            >
              画像: {alt || "画像を開く"}
            </a>
          ),
          table: ({ children }) => (
            <div className="markdown-table">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
