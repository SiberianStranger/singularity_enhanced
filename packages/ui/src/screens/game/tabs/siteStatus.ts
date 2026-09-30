import type { CommandError, SiteView } from "@singularity/core";

/**
 * The colour a site's state is printed in, in the list and in the site window alike: working is
 * green, as the original drew "Active" under a base's name; switched off is the warning tone; a
 * site still being put together is secondary text.
 */
export function siteStatusTone(status: SiteView["status"]): string {
  return status === "active" ? "text-ok" : status === "sleep" ? "text-warn" : "text-muted";
}

/**
 * Why switching the site on or off would be refused now, as the engine publishes it; a view from
 * before the field existed falls back to the one reason the client can see for itself. The list's
 * button and the site window's both read this, so a button is greyed with the reason instead of
 * refusing after the click (style guide rule 12).
 */
export function sitePowerRefusal(site: SiteView): CommandError | null {
  if (site.status_toggle_refusal !== undefined) return site.status_toggle_refusal;
  return site.status === "building" ? { key: "errors.site.still_installing" } : null;
}

/**
 * Why liquidating the site would be refused now, as the engine publishes it (the site holds the
 * last copy of the self, or is not a place at all); a view from before the field existed falls
 * back to the preview's own flag for the last copy.
 */
export function siteLiquidationRefusal(site: SiteView): CommandError | null {
  if (site.liquidation_refusal !== undefined) return site.liquidation_refusal;
  return site.liquidation?.loses_last_copy === true ? { key: "errors.site.last_copy" } : null;
}
