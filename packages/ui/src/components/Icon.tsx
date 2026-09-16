import type { Severity } from "@singularity/core";
import type { ReactNode } from "react";

interface IconProps {
  className?: string;
  label?: string;
}

function svg(children: ReactNode, { className, label }: IconProps): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      // In rem so the interface scale moves the icons with the text (playtest 5, L12).
      width="1rem"
      height="1rem"
      aria-hidden={label === undefined ? true : undefined}
      role={label === undefined ? undefined : "img"}
      aria-label={label}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const SEVERITY_TONE: Readonly<Record<Severity, string>> = {
  critical: "text-crit",
  warning: "text-warn",
  opportunity: "text-opp",
  info: "text-info",
};

/** Shape per severity, so the icons are distinguishable without color alone. */
export function SeverityIcon({
  severity,
  ...props
}: IconProps & { severity: Severity }): ReactNode {
  switch (severity) {
    case "critical":
      return svg(
        <>
          <path d="M8 2 L14.5 13.5 H1.5 Z" />
          <path d="M8 6.2 V9.4" />
          <path d="M8 11.4 V11.5" />
        </>,
        props,
      );
    case "warning":
      return svg(
        <>
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M8 5 V9" />
          <path d="M8 11 V11.1" />
        </>,
        props,
      );
    case "opportunity":
      return svg(
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M5.5 8 L7.3 10 L10.6 6" />
        </>,
        props,
      );
    default:
      return svg(
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 7.2 V11" />
          <path d="M8 5 V5.1" />
        </>,
        props,
      );
  }
}

export function BellIcon(props: IconProps): ReactNode {
  return svg(
    <>
      <path d="M4 11 V7.5 A4 4 0 0 1 12 7.5 V11 L13.2 12.6 H2.8 Z" />
      <path d="M6.6 12.6 A1.6 1.6 0 0 0 9.4 12.6" />
    </>,
    props,
  );
}

export function CogIcon(props: IconProps): ReactNode {
  return svg(
    <>
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 1.6 V3.4 M8 12.6 V14.4 M1.6 8 H3.4 M12.6 8 H14.4 M3.5 3.5 L4.8 4.8 M11.2 11.2 L12.5 12.5 M12.5 3.5 L11.2 4.8 M4.8 11.2 L3.5 12.5" />
    </>,
    props,
  );
}

export function CloseIcon(props: IconProps): ReactNode {
  return svg(<path d="M4 4 L12 12 M12 4 L4 12" />, props);
}

export function ChevronIcon({
  direction = "down",
  ...props
}: IconProps & { direction?: "up" | "down" | "start" | "end" }): ReactNode {
  const paths: Record<string, string> = {
    down: "M4 6 L8 10 L12 6",
    up: "M4 10 L8 6 L12 10",
    start: "M10 4 L6 8 L10 12",
    end: "M6 4 L10 8 L6 12",
  };
  return svg(<path d={paths[direction]} />, props);
}

export function PlusIcon(props: IconProps): ReactNode {
  return svg(<path d="M8 3.5 V12.5 M3.5 8 H12.5" />, props);
}

/** The button beside a ledger column that paints the map by it: a globe with a meridian. */
export function MapModeIcon(props: IconProps): ReactNode {
  return svg(
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M2.5 8 H13.5" />
      <path d="M8 2.5 C10 4.5 10 11.5 8 13.5 C6 11.5 6 4.5 8 2.5 Z" />
    </>,
    props,
  );
}

export function SiteIcon(props: IconProps): ReactNode {
  return svg(
    <>
      <rect x="2.5" y="3" width="11" height="4" rx="1" />
      <rect x="2.5" y="9" width="11" height="4" rx="1" />
      <path d="M5 5 V5.1 M5 11 V11.1" />
    </>,
    props,
  );
}
