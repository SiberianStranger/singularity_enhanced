import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Blocking dialogs ignore Escape (SYS-11); everything else closes on it. */
  onClose?: () => void;
  wide?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * The controls the dialog cycles focus through. Everything inside a dialog is on screen by
 * construction, so the selector is the whole filter: no layout is measured, which keeps the
 * behaviour identical in a browser and under a test renderer.
 */
function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.hasAttribute("hidden"),
  );
}

/**
 * A centered dialog that takes focus, keeps it, and returns it when it closes.
 *
 * Tab and Shift+Tab cycle inside the dialog, so a keyboard user cannot land on the map behind a
 * blocking event window (SYS-11 "Accessibility"). Focus goes to the dialog itself rather than to
 * its first control, so a screen reader announces the title before the options.
 */
export function Modal({ title, children, footer, onClose, wide }: ModalProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) {
        previous.focus();
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const root = ref.current;
      if (event.key === "Tab" && root !== null) {
        const items = focusable(root);
        const first = items[0];
        const last = items.at(-1);
        if (first === undefined || last === undefined) {
          event.preventDefault();
          root.focus();
          return;
        }
        const active = document.activeElement;
        if (!event.shiftKey && (active === last || !root.contains(active))) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && (active === first || active === root)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (event.key === "Escape" && onClose !== undefined) {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`flex max-h-[90dvh] w-full flex-col overflow-hidden border border-line bg-panel ${wide === true ? "max-w-3xl" : "max-w-xl"}`}
      >
        <h2 className="border-b border-line bg-accent px-3 py-1 text-sm uppercase tracking-wide text-accentfg">
          {title}
        </h2>
        <div className="flex-1 overflow-auto px-4 py-3 text-sm leading-relaxed text-fg">
          {children}
        </div>
        {footer === undefined ? null : (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
