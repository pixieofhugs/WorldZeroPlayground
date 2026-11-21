import type { CSSProperties, ReactNode } from "react";

interface ErrorBannerProps {
  message: ReactNode;
  /** A skin's alarm INK: `--color-danger` misses AA on every composer sheet in light (ADR-0061). */
  style?: CSSProperties;
  className?: string;
}

export function ErrorBanner({ message, style, className }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      // No `<form>`, so no native validation message; announce it (#2179).
      role="alert"
      className={className ? `font-body ${className}` : "font-body"}
      style={{
        fontSize: "var(--text-md)",
        color: "var(--color-danger)",
        marginTop: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--color-danger-veil)",
        border: "1px solid var(--color-danger-edge)",
        ...style,
      }}
    >
      {message}
    </div>
  );
}
