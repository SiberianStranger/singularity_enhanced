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

/**
 * A selectable option card: a square 1 px frame, inverted when it is the chosen one
 * (ui-style-guide.md rule 1).
 */
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
      className={`flex h-full w-full flex-col items-start gap-1 border p-2 text-start disabled:cursor-not-allowed disabled:opacity-50 ${
        selected === true
          ? "border-linestrong bg-accent text-accentfg"
          : "border-line bg-panel hover:border-linestrong"
      }`}
    >
      <span className="text-sm uppercase tracking-wide">{title}</span>
      {subtitle === undefined ? null : (
        <span className={`text-xs ${selected === true ? "text-accentfg" : "text-muted"}`}>
          {subtitle}
        </span>
      )}
      {warning === undefined ? null : (
        <span className="border border-crit px-1 text-xs text-crit">{warning}</span>
      )}
      {children === undefined ? null : (
        <span
          className={`mt-1 block w-full font-sans text-xs leading-snug normal-case ${selected === true ? "text-accentfg" : "text-muted"}`}
        >
          {children}
        </span>
      )}
    </button>
  );
}
