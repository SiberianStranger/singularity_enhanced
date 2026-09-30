import { memo, type ReactNode } from "react";
import { geometryToPath, MAP_HEIGHT, MAP_WIDTH } from "./projection.js";
import { ukraineMapParts } from "./topology.js";
import {
  CONTROL_BASELINE_DATE,
  UKRAINE_CONTROL_REGIONS,
  UKRAINE_LIGHT_PROFILES,
} from "./ukraine-control.js";

const parts = ukraineMapParts();
/**
 * Whether the atlas gave up Crimea as a polygon of its own. A future atlas that does not leaves
 * all three layers off rather than stopping the map from drawing (map review, 2026-09-30).
 */
const available = parts.mainland !== undefined && parts.crimea !== undefined;
const mainlandPath = geometryToPath(parts.mainland);
const crimeaPath = geometryToPath(parts.crimea);
const controlPaths = UKRAINE_CONTROL_REGIONS.map((region) => ({
  ...region,
  path: geometryToPath(region.geometry),
}));
const lights = UKRAINE_LIGHT_PROFILES.map((profile) => ({
  ...profile,
  path: geometryToPath(profile.geometry),
}));

/**
 * The clips and the light-profile mask. The dimming is a black layer whose opacity is one minus a
 * profile's factor, so every pixel of the night texture under it keeps that share of its light:
 * a city at 0.25 is a quarter as bright, and its dimmer edge a quarter as bright as that edge was.
 * The first version masked the layer by the texture's own brightness through a threshold, which
 * dimmed a city's core more than its rim and drew every occupied city as a ring (control room
 * review, 2026-09-30). The source textures stay byte-for-byte; the day side is untouched because
 * the layer sits under the night mask.
 */
export const UkraineMapDefinitions = memo(function UkraineMapDefinitions({
  id,
}: {
  id: string;
}): ReactNode {
  if (!available) return null;
  return (
    <>
      <clipPath id={`ua-mainland-${id}`}>
        <path d={mainlandPath} />
      </clipPath>
      <clipPath id={`ua-controlled-${id}`}>
        {controlPaths.map((region) => (
          <path key={region.id} d={region.path} />
        ))}
      </clipPath>
      <mask
        id={`ua-light-profile-${id}`}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
      >
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="black" />
        <g clipPath={`url(#ua-mainland-${id})`}>
          <g clipPath={`url(#ua-controlled-${id})`}>
            {lights.map((profile) => {
              const opacity = Math.round((1 - profile.factor) * 255);
              return (
                <path
                  key={profile.id}
                  data-light-profile={profile.id}
                  data-factor={profile.factor}
                  d={profile.path}
                  fill={`rgb(${opacity} ${opacity} ${opacity})`}
                />
              );
            })}
          </g>
        </g>
      </mask>
    </>
  );
});

export const UkraineNightLights = memo(function UkraineNightLights({
  id,
  nightMaskId,
}: {
  id: string;
  nightMaskId: string;
}): ReactNode {
  if (!available) return null;
  return (
    <g data-testid="regional-night-lights" pointerEvents="none" mask={`url(#${nightMaskId})`}>
      <rect
        x="0"
        y="0"
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        fill="black"
        mask={`url(#ua-light-profile-${id})`}
      />
    </g>
  );
});

/**
 * Control uses its own tint with no map labels, and leaves pointer targeting to sovereign paths.
 *
 * The tint is screened onto what is under it rather than laid over it: a plain translucent fill
 * dimmed every light it covered, so Crimea, which keeps the original's full lighting, read as dark
 * as the dimmed mainland. Screening can only lighten, so the region takes the colour while its
 * lights stay as bright as the light profiles leave them.
 */
export const UkraineControlOverlay = memo(function UkraineControlOverlay({
  id,
}: {
  id: string;
}): ReactNode {
  if (!available) return null;
  return (
    <g
      pointerEvents="none"
      data-testid="ukraine-control-layer"
      data-baseline={CONTROL_BASELINE_DATE}
    >
      <g clipPath={`url(#ua-mainland-${id})`} style={{ mixBlendMode: "screen" }}>
        {controlPaths.map((region) => (
          <path
            key={region.id}
            d={region.path}
            data-testid={`map-control-${region.id}`}
            data-country="ua"
            data-controller="ru"
            fill="var(--c-map-occupied)"
            fillOpacity="0.24"
            stroke="var(--c-map-control-line)"
            strokeWidth="0.7"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <path
        d={crimeaPath}
        data-testid="map-control-crimea"
        data-country="ua"
        data-controller="ru"
        data-light-factor="1"
        style={{ mixBlendMode: "screen" }}
        fill="var(--c-map-occupied)"
        fillOpacity="0.24"
        stroke="var(--c-map-control-line)"
        strokeWidth="0.7"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
});
