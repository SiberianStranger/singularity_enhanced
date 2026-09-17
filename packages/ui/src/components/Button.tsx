import { type ButtonHTMLAttributes, type ReactNode, useCallback, useRef } from "react";
import { playSound } from "../audio/index.js";
import { HOTKEY_ATTRIBUTE, useHotkey } from "../lib/hotkeys.js";
import { Hotkey } from "./Hotkey.js";
import { Tooltip } from "./Tooltip.js";

type Variant = "primary" | "default" | "ghost" | "danger";

/**
 * Rectangles with a 1 px border, uppercase in the angular face; the primary one is inverted
 * (ui-style-guide.md, "Components"). Nothing rounds, fills with a gradient or casts a shadow.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accentfg border-linestrong",
  default: "bg-panel text-fg border-line hover:bg-accent hover:text-accentfg",
  ghost: "bg-transparent text-muted border-transparent hover:border-line hover:text-fg",
  danger: "bg-transparent text-crit border-crit hover:bg-crit hover:text-bg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Shown as a tooltip; when the button is disabled this is the requirement that blocks it. */
  tooltip?: ReactNode;
  /**
   * Accelerator letter: underlined in the label, and pressing it clicks the button while no text
   * field has focus. `registerKey={false}` keeps the underline for a key another component already
   * owns, such as a panel tab whose letter is a global panel hotkey.
   *
   * It comes from the locale (`accelerator(t, "<label key>")`), so a language that has given this
   * control no letter passes `undefined` and the button is simply drawn without an underline.
   */
  hotkey?: string | undefined;
  registerKey?: boolean;
}

/** A button that explains itself: a disabled one keeps its tooltip so the reason stays readable. */
export function Button({
  variant = "default",
  tooltip,
  className,
  children,
  disabled,
  hotkey,
  registerKey = true,
  onClick,
  ...rest
}: ButtonProps): ReactNode {
  const element = useRef<HTMLButtonElement>(null);
  // A real click on the element rather than a hand-made event, so the handler sees exactly what a
  // pointer press produces.
  const press = useCallback(() => element.current?.click(), []);
  useHotkey(registerKey ? hotkey : undefined, press, { enabled: disabled !== true });

  const label =
    typeof children === "string" && hotkey !== undefined ? (
      <Hotkey label={children} letter={hotkey} />
    ) : (
      children
    );

  const button = (
    <button
      ref={element}
      type="button"
      disabled={disabled}
      {...(hotkey === undefined ? {} : { [HOTKEY_ATTRIBUTE]: hotkey.toLowerCase() })}
      className={`inline-flex items-center justify-center gap-1 border px-2 py-1 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className ?? ""}`}
      onClick={(event) => {
        // The click of the style guide (rule 10). It is here rather than in forty handlers, and it
        // is silent until the first gesture unlocks the channel and while the player mutes it.
        playSound("click");
        onClick?.(event);
      }}
      {...rest}
    >
      {label}
    </button>
  );
  if (tooltip === undefined) {
    return button;
  }
  return <Tooltip content={tooltip}>{button}</Tooltip>;
}
