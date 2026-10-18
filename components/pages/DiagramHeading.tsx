/** Shared accessible heading for diagram variants. */
export default function DiagramHeading({ eyebrow, title, body }: { eyebrow: string; title?: string; body?: string }) {
  return (
    <header className="sf-diagram-head">
      <span className="sf-diagram-eyebrow">{eyebrow}</span>
      {title ? <h2>{title}</h2> : null}
      {body ? <p>{body}</p> : null}
    </header>
  )
}
