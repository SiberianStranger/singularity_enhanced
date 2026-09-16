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
  const subHour = useSubHour(20);

  return (
    <WorldMap
      countries={countries}
      mode={mapMode}
      style={mapStyle}
      markers={markers}
      date={date}
      subHour={subHour}
      selectedCountry={selectedCountry}
      onSelect={onSelect}
      onContext={onContext}
    />
  );
}
