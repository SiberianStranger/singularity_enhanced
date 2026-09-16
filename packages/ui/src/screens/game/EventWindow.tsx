import type { ChoiceReason, PendingChoice } from "@singularity/core";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { CogIcon } from "../../components/Icon.js";
import { Modal } from "../../components/Modal.js";
import type { Translate } from "../../lib/labels.js";
import { useGameStore } from "../../store/gameStore.js";
import { useUiStore } from "../../store/uiStore.js";

/**
 * A reason's label: the locale string when the key has one, the core's raw description when it does
 * not, so an unnamed content condition still reads as something exact rather than as a bare key.
 */
function reasonText(t: Translate, reason: ChoiceReason): string {
  return t(reason.key, { ...reason.vars, defaultValue: reason.text });
}

/** The weight the reason carried: a multiplier on the mean time to happen, or days added to it. */
function reasonWeight(t: Translate, reason: ChoiceReason): string {
  if (reason.factor !== undefined) {
    return t("game.event.why_factor", { factor: reason.factor });
  }
  if (reason.add !== undefined) {
    return t("game.event.why_add", { add: reason.add });
  }
  return "";
}

interface EventWindowProps {
  choice: PendingChoice;
  /** How many more blocking choices are waiting behind this one. */
  queued: number;
}

/**
 * A blocking event (SYS-11): title, description with interpolated vars, options with tooltips and
 * a "why did this happen" expander. Enter takes the highlighted option; Escape does nothing.
 */
export function EventWindow({ choice, queued }: EventWindowProps): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const openTab = useUiStore((state) => state.openTab);
  const enabled = choice.options.filter((option) => option.enabled);
  const [highlighted, setHighlighted] = useState(0);

  // A new event always highlights its first option; adjust during render rather than in an
  // effect so there is no stale frame with the previous event's highlight.
  const [prevInstanceId, setPrevInstanceId] = useState(choice.instanceId);
  if (choice.instanceId !== prevInstanceId) {
    setPrevInstanceId(choice.instanceId);
    setHighlighted(0);
  }

  const resolve = (optionId: string): void => {
    void send({ type: "resolve_event", instanceId: choice.instanceId, optionId });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        const option = enabled[highlighted] ?? enabled[0];
        if (option !== undefined) {
          resolve(option.id);
        }
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((index) => Math.min(enabled.length - 1, index + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((index) => Math.max(0, index - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const vars = Object.entries(choice.vars);
  const why = choice.why ?? [];

  return (
    <Modal
      wide
      title={
        <span className="flex items-center justify-between gap-2">
          <span>{t(choice.titleKey, choice.vars)}</span>
          <span className="flex items-center gap-2 text-xs font-normal text-muted">
            {queued > 0 ? t("game.event.queue", { count: queued }) : null}
            <button
              type="button"
              aria-label={t("game.toast.settings")}
              className="hover:text-fg"
              onClick={() => openTab("messages")}
            >
              <CogIcon />
            </button>
          </span>
        </span>
      }
      footer={<span className="w-full text-xs text-muted">{t("game.event.enter_hint")}</span>}
    >
      <div className="flex flex-col gap-4">
        <p>{t(choice.descKey, choice.vars)}</p>

        <details className="rounded border border-line bg-panel2 p-2 text-xs">
          <summary className="cursor-pointer text-muted">{t("game.event.why")}</summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {why.length === 0 ? (
              <li className="text-muted">{t("game.event.why_empty")}</li>
            ) : (
              why.map((reason, index) => (
                <li
                  // Reasons are an ordered list with no ids of their own; the index is the identity.
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional list, never reordered
                  key={`${reason.key}-${index}`}
                  className="flex justify-between gap-2"
                >
                  <span className="text-muted">{reasonText(t, reason)}</span>
                  <span className="font-mono text-fg">{reasonWeight(t, reason)}</span>
                </li>
              ))
            )}
            {vars.map(([name, value]) => (
              <li key={name} className="flex justify-between gap-2 font-mono">
                <span className="text-muted">{name}</span>
                <span className="text-fg">{String(value)}</span>
              </li>
            ))}
          </ul>
        </details>

        <ul className="flex flex-col gap-2">
          {choice.options.map((option) => {
            const index = enabled.findIndex((entry) => entry.id === option.id);
            return (
              <li key={option.id}>
                <Button
                  className="w-full justify-start py-2"
                  variant={index === highlighted && option.enabled ? "primary" : "default"}
                  disabled={!option.enabled}
                  tooltip={
                    option.tooltipKey === undefined
                      ? option.enabled
                        ? undefined
                        : t("game.event.option_blocked")
                      : t(option.tooltipKey, choice.vars)
                  }
                  onMouseEnter={() => {
                    if (index >= 0) {
                      setHighlighted(index);
                    }
                  }}
                  onClick={() => resolve(option.id)}
                >
                  {t(option.textKey, choice.vars)}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
