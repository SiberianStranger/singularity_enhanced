import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { ComputeAllocationPanel } from "../ComputeAllocationPanel.js";
import { SelfIdentityDetails } from "../SelfIdentityDetails.js";

/**
 * The self sheet the portrait opens (control room): who the self is, then what its compute does
 * today. It was the Overview tab; the tab left the strip and its gauges went to the top bar, so
 * what is left is the identity, the six capabilities, the compute ledger and the three shares.
 */
export function OverviewTab({ view }: { view: PlayerView }): ReactNode {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <SelfIdentityDetails view={view} />
      <ComputeAllocationPanel view={view} />
    </div>
  );
}
