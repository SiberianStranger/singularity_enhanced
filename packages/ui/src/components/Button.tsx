import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "./Tooltip.js";

type Variant = "primary" | "default" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accentfg border-accent hover:opacity-90",
  default: "bg-panel2 text-fg border-line hover:border-accent",
  ghost: "bg-transparent text-muted border-transparent hover:text-fg hover:border-line",
  danger: "bg-transparent text-crit border-crit hover:bg-crit hover:text-accentfg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Shown as a tooltip; when the button is disabled this is the requirement that blocks it. */
  tooltip?: ReactNode;
}

/** A button that explains itself: a disabled one keeps its tooltip so the reason stays readable. */
export function Button({
  variant = "default",
  tooltip,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps): ReactNode {
  const button = (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1 rounded border px-2 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
  if (tooltip === undefined) {
    return button;
  }
  return <Tooltip content={tooltip}>{button}</Tooltip>;
}
