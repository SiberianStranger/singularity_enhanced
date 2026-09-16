import type { ReactNode } from "react";
import { splitLabel } from "../lib/hotkeys.js";

interface HotkeyProps {
  /** The already localized label of the control. */
  label: string;
  /** The accelerator; when absent the label is rendered as it is. */
  letter?: string | undefined;
}

/**
 * A label with its accelerator letter underlined (ui-style-guide.md rule 4).
 *
 * The underline is a real text underline, never a border: a border under a letter moves with the
 * font metrics and disappears at small sizes, and the rule exists because the original game drew
 * the letter itself underlined.
 *
 * Splitting the label into three elements is a visual device, and it must not reach the accessible
 * name: an accessible-name computation walks the elements and puts a space between them, so a
 * "Menu" button with its M underlined announced itself as "M enu". The whole label is therefore in
 * the DOM once, visually hidden and unsplit, and the split copy that is actually drawn is hidden
 * from assistive technology.
 */
export function Hotkey({ label, letter }: HotkeyProps): ReactNode {
  if (letter === undefined || letter === "") {
    return <span>{label}</span>;
  }
  const parts = splitLabel(label, letter);
  return (
    <span>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        {parts.before}
        <u>{parts.letter}</u>
        {parts.after}
      </span>
    </span>
  );
}
