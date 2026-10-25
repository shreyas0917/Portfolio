const MARKER = '[to fill]'

/**
 * Renders data text, showing each "[to fill]" marker as a visible dashed
 * placeholder: missing facts stay obviously missing instead of looking finished.
 */
export function Fillable({ text }: { text: string }) {
  if (!text.includes(MARKER)) return <>{text}</>
  return (
    <>
      {text.split(MARKER).map((part, i) => (
        <span key={i}>
          {i > 0 && (
            <span
              title="Placeholder: to be filled in"
              className="inline-block rounded border border-dashed border-line-strong px-1.5 align-baseline font-mono text-[0.78em] leading-normal text-fg-muted"
            >
              {MARKER}
            </span>
          )}
          {part}
        </span>
      ))}
    </>
  )
}

export function isPlaceholder(text: string) {
  return text.includes(MARKER)
}
