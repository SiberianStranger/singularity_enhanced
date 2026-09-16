import type { ReactNode } from "react";

interface CardProps {
  title: ReactNode;
  children?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
}

/**
 * A selectable option card: a square 1 px frame, inverted when it is the chosen one
 * (ui-style-guide.md rule 1).
 *
 * It is what is left of the card grid the configurator used to be. Everything that is a choice
 * from a long list is a row of `StepLayout`'s master list now, and the two places a grid still
 * reads better than a list are the difficulty presets and the storytellers, which are four and
 * three short paragraphs the player compares side by side. The props nothing passes any more
 * (a subtitle, a disabled state, a warning line) are gone with the grids that used them.
 */
export function Card({ title, children, selected, onSelect }: CardProps): ReactNode {
  return (
    <button
      type="button"
      aria-pressed={selected === true}
      onClick={onSelect}
      className={`flex h-full w-full flex-col items-start gap-1 border p-2 text-start ${
        selected === true
          ? "border-linestrong bg-accent text-accentfg"
          : "border-line bg-panel hover:border-linestrong"
      }`}
    >
      <span className="text-sm uppercase tracking-wide">{title}</span>
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
