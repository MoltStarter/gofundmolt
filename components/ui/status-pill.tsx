export type StatusTone = "neutral" | "success" | "warning" | "danger" | "accent";

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatusTone;
}) {
  return <span className={`status-pill ${tone}`}>{label.replaceAll("_", " ")}</span>;
}
