import type { ReactNode } from "react";
import { Hotkey } from "./Hotkey.js";

interface FrameProps {
  /** Already localized title; drawn uppercase in the angular face on the inverted bar. */
  title: string;
  /** Accelerator letter to underline in the title; the key itself belongs to the control inside. */
  hotkey?: string;
  /** Controls that sit at the end of the header bar (a "?" button, a close button). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Passed through so a panel can be found by a test or targeted by a jump link. */
  id?: string;
}

/**
 * The panel of the style guide: a 1 px frame with a header bar inverted against it (white text on
 * blue), square, flat, with no shadow. Every panel in the client is one of these, so the look
 * changes in one place rather than in forty class lists.
 */
export function Frame({
  title,
  hotkey,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: FrameProps): ReactNode {
  return (
    <section
      id={id}
      aria-label={title}
      className={`flex min-h-0 flex-col border border-line bg-panel ${className ?? ""}`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-accent px-2 py-1">
        <h2 className="flex-1 truncate text-xs uppercase tracking-wide text-accentfg">
          <Hotkey label={title} letter={hotkey} />
        </h2>
        {actions}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName ?? "overflow-auto p-2"}`}>{children}</div>
    </section>
  );
}
