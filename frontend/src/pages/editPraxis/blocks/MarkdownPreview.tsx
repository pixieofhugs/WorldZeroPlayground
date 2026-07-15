import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  source: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Thin wrapper around react-markdown so each archetype can apply its own
 * typography (newspaper columns, terminal mono, IM Fell English, etc.) by
 * passing className/style. Returns null when the source is empty so callers
 * can keep their layout simple.
 */
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
