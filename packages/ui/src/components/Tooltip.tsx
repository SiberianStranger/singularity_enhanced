import { type ReactNode, useId, useState } from "react";

interface TooltipProps {
  /** Tooltip body; already localized by the caller. */
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Hover and focus tooltip. It is a real element rather than a `title` attribute so it can hold
 * several lines (an indicator's contributing values, a blocked action's reason) and be read by
 * screen readers through `aria-describedby`.
 */
export function Tooltip({ content, children, className }: TooltipProps): ReactNode {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      role="note"
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className="pointer-events-none absolute bottom-full start-0 z-50 mb-1 w-max max-w-72 rounded border border-line bg-panel2 px-2 py-1 text-xs leading-snug text-fg shadow-lg"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
