import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  source: string;
  className?: string;
  style?: CSSProperties;
}

/** react-markdown with archetype className/style; null for empty source. */
export default function MarkdownPreview({
  source,
  className,
  style,
}: MarkdownPreviewProps) {
  if (!source.trim()) return null;
  return (
    <div className={className} style={style}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
