/** Extract URLs from text and split a block into segments rendering links. */
import React from "react";

const URL_RE = /(https?:\/\/[^\s,;)]+)/g;

export function renderWithLinks(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  const re = new RegExp(URL_RE);
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <a
        key={i++}
        href={match[0]}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary break-all"
      >
        {match[0]}
      </a>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
