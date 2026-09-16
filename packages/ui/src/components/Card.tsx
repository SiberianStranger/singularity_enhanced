import type { ReactNode } from "react";

interface CardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  warning?: ReactNode;
  onSelect?: () => void;
}

/** A selectable option card: the configurator's unit of choice. */
export function Card({
  title,
  subtitle,
  children,
  selected,
  disabled,
  warning,
  onSelect,
}: CardProps): ReactNode {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected === true}
      onClick={onSelect}
      className={`flex h-full w-full flex-col items-start gap-1 rounded border p-3 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected === true
          ? "border-accent bg-panel2"
          : "border-line bg-panel hover:border-accent/70"
      }`}
    >
      <span className="text-sm font-semibold text-fg">{title}</span>
      {subtitle === undefined ? null : <span className="text-xs text-muted">{subtitle}</span>}
      {warning === undefined ? null : (
        <span className="rounded bg-crit/15 px-1.5 py-0.5 text-xs text-crit">{warning}</span>
      )}
      {children === undefined ? null : (
        <span className="mt-1 block w-full text-xs leading-relaxed text-muted">{children}</span>
      )}
    </button>
  );
}
