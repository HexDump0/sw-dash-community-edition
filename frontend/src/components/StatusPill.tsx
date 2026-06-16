interface StatusPillProps {
  status: string;
  label?: string;
}

export function StatusPill({ status, label }: StatusPillProps) {
  const normalized = status.toLowerCase();
  return (
    <span className={`status-pill status-pill--${normalized}`}>
      {label ?? status}
    </span>
  );
}
