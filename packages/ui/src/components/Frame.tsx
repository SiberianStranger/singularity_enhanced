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
  /** False for a frame already inside a bordered container, so two 1 px lines do not stack. */
  bordered?: boolean;
}

/**
 * The panel of the style guide: a 1 px frame with a header bar inverted against it (white text on
 * blue), square, flat, with no shadow.
 *
 * Every titled panel in the client is one of these, so the look changes here rather than in a
 * dozen class lists: the selection panel, the outliner and the configurator's step header all came
 * back to it after playtest 3. The one panel that is not is the pinned primary panel, whose header
 * bar is a tab strip rather than a title; an inverted bar there would sit under an inverted active
 * tab, and two inversions on top of each other read as neither.
 */
export function Frame({
  title,
  hotkey,
  actions,
  children,
  className,
  bodyClassName,
  id,
  bordered,
}: FrameProps): ReactNode {
  return (
    <section
      id={id}
      aria-label={title}
      className={`flex min-h-0 flex-col bg-panel ${bordered === false ? "" : "border border-line"} ${className ?? ""}`}
    >
      {/*
       * A div rather than a `<header>`: the bar is chrome, not a landmark. HTML says a `<header>`
       * inside a section is not a banner, but the accessibility mappings that testing tools and
       * some readers use do not implement that exception, and four panels claiming to be the
       * banner of the page is worse than none of them saying anything. The `<section>` above
       * already carries the accessible name.
       */}
      <div className="flex shrink-0 flex-wrap items-start gap-x-2 border-b border-line bg-accent px-2 py-0.5">
        {/*
         * L7: the title wraps rather than truncating, and it keeps its own minimum width, so the
         * controls beside it wrap to a second line instead of squeezing it. A panel 14 rem wide
         * whose actions took the rest of the bar printed its own name as "O...", which tells the
         * player nothing at all; a second row of a title bar costs a few pixels and says
         * "Outliner".
         */}
        <h2 className="flex-1 text-xs uppercase tracking-wide text-accentfg">
          <Hotkey label={title} letter={hotkey} />
        </h2>
        <span className="flex shrink-0 items-center gap-1">{actions}</span>
      </div>
      <div className={`min-h-0 flex-1 ${bodyClassName ?? "overflow-auto p-2"}`}>{children}</div>
    </section>
  );
}
