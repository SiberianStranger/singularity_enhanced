import { memo, type ReactNode } from "react";
import { MAP_HEIGHT, MAP_WIDTH } from "./projection.js";
import { dashedEdge, hatchFor, type TerritoryPaint } from "./territories.js";
import type { DrawnTerritory } from "./territory-geometry.js";

/*
 * The territories of SYS-26 on the map: one set of rules for any of them.
 *
 * Every territory is a group over the country paths: its outline filled with the holder's colour
 * in the current map mode (and hit, so a click selects the de jure owner and names the territory),
 * a hatch in the owner's colour whose density is the status and the recognition figure, and a
 * dashed line where the holder's control ends on the owner's land. Under the group, the owner's
 * own fill is cut out of the territory (so the holder's colour is not tinted by it) and the owner's
 * border is drawn again over the hatch, so the de jure border stays solid. Night lights are dimmed
 * by the territory's light profile under the country paths, as before. The rasters are never
 * touched and nothing here carries text; the words are the tooltip's and the selection panel's.
 */

/** Ids of everything the layers define, scoped by the map instance's `useId`. */
export const territoryIds = {
  land: (scope: string, territory: string) => `territory-land-${territory}-${scope}`,
  shape: (scope: string, territory: string) => `territory-shape-${territory}-${scope}`,
  hatch: (scope: string, territory: string) => `territory-hatch-${territory}-${scope}`,
  edge: (scope: string, territory: string) => `territory-edge-${territory}-${scope}`,
  holes: (scope: string, owner: string) => `territory-holes-${owner}-${scope}`,
  area: (scope: string, owner: string) => `territory-area-${owner}-${scope}`,
  lights: (scope: string) => `territory-lights-${scope}`,
};

/** CSS-safe form of a `useId` value, which React writes with colons. */
function scoped(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, "");
}

function owners(territories: readonly DrawnTerritory[]): string[] {
  return [...new Set(territories.map((entry) => entry.def.de_jure))];
}

/** The countries whose fill the territories cut, so the country layer can ask for the mask. */
export function territoryOwners(territories: readonly DrawnTerritory[]): ReadonlySet<string> {
  return new Set(owners(territories));
}

/** The mask a de jure owner's country path takes: its fill and border cut out of its territories. */
export function territoryHolesMask(scope: string, owner: string): string {
  return `url(#${territoryIds.holes(scoped(scope), owner)})`;
}

function gray(factor: number): string {
  const level = Math.round((1 - factor) * 255);
  return `rgb(${level} ${level} ${level})`;
}

/** A full-map rectangle, clipped or masked to whatever the caller asks; never a pointer target. */
function MapRect(props: {
  fill: string;
  clipPath?: string;
  mask?: string;
  testId?: string;
}): ReactNode {
  return (
    <rect
      x="0"
      y="0"
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      fill={props.fill}
      clipPath={props.clipPath}
      mask={props.mask}
      data-testid={props.testId}
      pointerEvents="none"
    />
  );
}

interface DefinitionProps {
  id: string;
  territories: readonly DrawnTerritory[];
  /** Map units per screen pixel, so a hatch keeps its density on screen at every zoom. */
  unit: number;
  paints: ReadonlyMap<string, TerritoryPaint>;
  /** Whether the night-light mask is needed (the textured map with a night side). */
  lights: boolean;
}

/**
 * The clips, masks and patterns. The dimming is a black layer whose opacity is one minus a
 * profile's factor, so every pixel of the night texture under it keeps that share of its light:
 * a city at 0.25 is a quarter as bright, and its dimmer edge a quarter as bright as that edge was
 * (control room review, 2026-09-30). The source textures stay byte-for-byte; the day side is
 * untouched because the layer sits under the night mask.
 */
export const TerritoryDefinitions = memo(function TerritoryDefinitions({
  id,
  territories,
  unit,
  paints,
  lights,
}: DefinitionProps): ReactNode {
  const scope = scoped(id);
  if (territories.length === 0) {
    return null;
  }
  return (
    <>
      {territories.map((territory) => {
        const key = territory.def.id;
        const land = territoryIds.land(scope, key);
        const hatch = hatchFor(territory.def.status, territory.def.recognition);
        const paint = paints.get(key);
        const spacing = hatch.spacing * unit;
        const width = hatch.width * unit;
        return (
          <g key={key}>
            <clipPath id={land}>
              <path d={territory.landPath} />
            </clipPath>
            {/* A clip on a clipPath intersects: an envelope is its outline and the owner's land. */}
            <clipPath
              id={territoryIds.shape(scope, key)}
              clipPath={territory.clipped ? `url(#${land})` : undefined}
            >
              <path d={territory.path} />
            </clipPath>
            {hatch.kind === "none" || paint === undefined ? null : (
              <pattern
                id={territoryIds.hatch(scope, key)}
                data-testid={`territory-hatch-${key}`}
                data-kind={hatch.kind}
                data-spacing={hatch.spacing.toFixed(2)}
                data-color={paint.hatch}
                patternUnits="userSpaceOnUse"
                width={spacing}
                height={spacing}
                patternTransform="rotate(45)"
              >
                <line
                  x1={spacing / 2}
                  y1="0"
                  x2={spacing / 2}
                  y2={spacing}
                  stroke={paint.hatch}
                  strokeWidth={width}
                  strokeOpacity={hatch.opacity}
                />
                {hatch.kind === "cross" ? (
                  <line
                    x1="0"
                    y1={spacing / 2}
                    x2={spacing}
                    y2={spacing / 2}
                    stroke={paint.hatch}
                    strokeWidth={width}
                    strokeOpacity={hatch.opacity}
                  />
                ) : null}
              </pattern>
            )}
            {/* The edge of control runs only over the owner's land that another holder keeps. */}
            <mask
              id={territoryIds.edge(scope, key)}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
            >
              <MapRect fill="white" />
              {territories
                .filter(
                  (other) =>
                    other !== territory &&
                    other.def.de_facto === territory.def.de_facto &&
                    other.def.de_jure === territory.def.de_jure,
                )
                .map((other) => (
                  <MapRect
                    key={other.def.id}
                    fill="black"
                    clipPath={`url(#${territoryIds.shape(scope, other.def.id)})`}
                  />
                ))}
            </mask>
          </g>
        );
      })}
      {owners(territories).map((owner) => {
        const own = territories.filter((entry) => entry.def.de_jure === owner);
        return (
          <g key={owner}>
            <mask
              id={territoryIds.holes(scope, owner)}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
            >
              <MapRect fill="white" />
              {own.map((entry) => (
                <MapRect
                  key={entry.def.id}
                  fill="black"
                  clipPath={`url(#${territoryIds.shape(scope, entry.def.id)})`}
                />
              ))}
            </mask>
            <clipPath id={territoryIds.area(scope, owner)}>
              {own.map((entry) => (
                <MapRect
                  key={entry.def.id}
                  fill="black"
                  clipPath={`url(#${territoryIds.shape(scope, entry.def.id)})`}
                />
              ))}
            </clipPath>
          </g>
        );
      })}
      {lights ? (
        <mask
          id={territoryIds.lights(scope)}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
        >
          <MapRect fill="black" />
          {territories
            .filter((entry) => (entry.def.light_profile ?? 1) < 1)
            .map((entry) => (
              <g key={entry.def.id} clipPath={`url(#${territoryIds.shape(scope, entry.def.id)})`}>
                <rect
                  x="0"
                  y="0"
                  width={MAP_WIDTH}
                  height={MAP_HEIGHT}
                  data-light-profile={entry.def.id}
                  data-factor={entry.def.light_profile}
                  fill={gray(entry.def.light_profile ?? 1)}
                />
                {entry.profiles.map((profile) => (
                  <path
                    key={profile.id}
                    data-light-profile={profile.id}
                    data-factor={profile.factor}
                    d={profile.path}
                    fill={gray(profile.factor)}
                  />
                ))}
              </g>
            ))}
        </mask>
      ) : null}
    </>
  );
});

/** The dimmed night lights, drawn over the night texture and under the country paths. */
export const TerritoryNightLights = memo(function TerritoryNightLights({
  id,
  nightMaskId,
  territories,
}: {
  id: string;
  nightMaskId: string;
  territories: readonly DrawnTerritory[];
}): ReactNode {
  if (!territories.some((entry) => (entry.def.light_profile ?? 1) < 1)) {
    return null;
  }
  return (
    <g data-testid="regional-night-lights" pointerEvents="none" mask={`url(#${nightMaskId})`}>
      <MapRect fill="black" mask={`url(#${territoryIds.lights(scoped(id))})`} />
    </g>
  );
});

export interface TerritoryHandlers {
  onSelect?: ((territory: DrawnTerritory) => void) | undefined;
  onContext?: ((territory: DrawnTerritory, position: { x: number; y: number }) => void) | undefined;
  onHover(owner: string | null): void;
}

interface OverlayProps extends TerritoryHandlers {
  id: string;
  territories: readonly DrawnTerritory[];
  paints: ReadonlyMap<string, TerritoryPaint>;
  /** The sentence each territory's tooltip carries. */
  sentences: ReadonlyMap<string, string>;
  /** The stroke the country paths are drawn with, for the owner's border drawn again on top. */
  ownerStroke(owner: string): {
    stroke: string;
    strokeWidth: number;
    strokeOpacity: number;
    vectorEffect?: "non-scaling-stroke";
  };
}

/**
 * The territories themselves, over the country paths and under the markers.
 *
 * The filled outline is the hit target: a click selects the de jure owner and names the
 * territory, a hover lights the owner's cities as the country path under it would, and the
 * outline's `<title>` is the sentence that says what the map shows.
 */
export const TerritoryOverlay = memo(function TerritoryOverlay({
  id,
  territories,
  paints,
  sentences,
  ownerStroke,
  onSelect,
  onContext,
  onHover,
}: OverlayProps): ReactNode {
  const scope = scoped(id);
  if (territories.length === 0) {
    return null;
  }
  return (
    <g data-testid="territory-layer">
      {territories.map((territory) => {
        const def = territory.def;
        const paint = paints.get(def.id);
        if (paint === undefined) {
          return null;
        }
        const hatch = hatchFor(def.status, def.recognition);
        const land = `url(#${territoryIds.land(scope, def.id)})`;
        const select = onSelect === undefined ? undefined : () => onSelect(territory);
        return (
          <g
            key={def.id}
            data-testid={`map-territory-${def.id}`}
            data-territory={def.id}
            data-de-jure={def.de_jure}
            data-de-facto={def.de_facto}
            data-status={def.status}
            data-recognition={def.recognition}
            data-hatch={hatch.kind}
            data-light-factor={def.light_profile ?? 1}
            data-baseline={def.geometry.kind === "envelope" ? def.geometry.as_of : undefined}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: the role and the keys are set whenever a handler is, which Biome cannot see through the conditional */}
            <path
              d={territory.path}
              clipPath={territory.clipped ? land : undefined}
              fill={paint.fill}
              data-testid={`map-territory-fill-${def.id}`}
              className={select === undefined ? undefined : "cursor-pointer"}
              role={select === undefined ? undefined : "button"}
              tabIndex={select === undefined ? undefined : 0}
              onClick={select}
              onKeyDown={
                select === undefined
                  ? undefined
                  : (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        select();
                      }
                    }
              }
              onContextMenu={
                onContext === undefined
                  ? undefined
                  : (event) => {
                      event.preventDefault();
                      onContext(territory, { x: event.clientX, y: event.clientY });
                    }
              }
              onPointerEnter={() => onHover(def.de_jure)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(def.de_jure)}
              onBlur={() => onHover(null)}
            >
              <title>{sentences.get(def.id) ?? def.id}</title>
            </path>
            {hatch.kind === "none" ? null : (
              <MapRect
                fill={`url(#${territoryIds.hatch(scope, def.id)})`}
                clipPath={`url(#${territoryIds.shape(scope, def.id)})`}
                testId={`map-territory-hatch-${def.id}`}
              />
            )}
            {dashedEdge(def.status) ? (
              <g
                clipPath={land}
                mask={`url(#${territoryIds.edge(scope, def.id)})`}
                pointerEvents="none"
              >
                <path
                  d={territory.path}
                  data-testid={`map-territory-edge-${def.id}`}
                  fill="none"
                  stroke={paint.edge}
                  strokeWidth={1.4}
                  strokeOpacity={0.9}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ) : null}
          </g>
        );
      })}
      {owners(territories).map((owner) => {
        const path = territories.find((entry) => entry.def.de_jure === owner)?.ownerPath ?? "";
        const stroke = ownerStroke(owner);
        return path === "" ? null : (
          <path
            key={owner}
            d={path}
            data-testid={`map-territory-border-${owner}`}
            fill="none"
            clipPath={`url(#${territoryIds.area(scope, owner)})`}
            pointerEvents="none"
            {...stroke}
          />
        );
      })}
    </g>
  );
});
