import type { CountryView, DateView } from "@singularity/core";
import type { ReactNode } from "react";
import { useUiStore } from "../../store/uiStore.js";
import { type MapMarker, type MapTarget, WorldMap } from "./map/WorldMap.js";
import { useSubHour } from "./useSmoothClock.js";

interface GameMapProps {
  countries: readonly CountryView[];
  markers: readonly MapMarker[];
  date: DateView;
  selectedCountry: string | null;
  onSelect(target: MapTarget): void;
  onContext(target: MapTarget, position: { x: number; y: number }): void;
}

/**
 * The world map as the game screen uses it: the player's map style, and the sub-hour phase that
 * slides the terminator between ticks.
 *
 * The interpolation lives here rather than in the game screen so that the frames between ticks
 * re-render the map and nothing else; the panels around it only redraw when the view does.
 */
export function GameMap({
  countries,
  markers,
  date,
  selectedCountry,
  onSelect,
  onContext,
}: GameMapProps): ReactNode {
  const mapMode = useUiStore((state) => state.mapMode);
  const mapStyle = useUiStore((state) => state.mapStyle);
  // Pan and zoom live in the store, not in the map, so opening a window or switching a panel does
  // not throw the player back to the whole world (playtest 3, R14).
  const mapView = useUiStore((state) => state.mapView);
  const setMapView = useUiStore((state) => state.setMapView);
  // 30 a second, the rate the clock face already asked for: the map's heavy layers (the country
  // paths, the markers) are memoized on their own inputs, so a frame between ticks re-runs this
  // component and redraws one path.
  const subHour = useSubHour(30);

  return (
    <WorldMap
      countries={countries}
      mode={mapMode}
      style={mapStyle}
      markers={markers}
      date={date}
      subHour={subHour}
      selectedCountry={selectedCountry}
      view={mapView}
      onViewChange={setMapView}
      onSelect={onSelect}
      onContext={onContext}
    />
  );
}
