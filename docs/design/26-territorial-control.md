# SYS-26: Territorial control and recognition

Status: v0 design, 2026-09-30. The map rendering is implemented in 0.3.1 from a data module in the
client; the data moves into content and the world state in a later engine pass (backlog P7).
Source of the requirement: [playtest 10](../playtests/2026-09-30-playtest-10-control-room-on-screen.md)
V1 and V2.

## Why

The world of 2027 has borders that do not match control, and control that does not carry
recognition. The game draws Crimea and the occupied territories of Ukraine today; the same
question arises for Taiwan, the Baltic states, Iran's neighbours, Kosovo, Western Sahara, Cyprus or
anything a scenario brings, and an escaped model may be one of the forces that moves it. The map
must show three things at once without a word of text on it: who the territory belongs to in law,
who holds it in fact, and how far the world accepts that.

## The model

```ts
type RecognitionStatus =
  | "recognized"          // control and title agree; drawn as the controller's own territory
  | "disputed"            // title contested between states, control stable (for example Kashmir)
  | "annexed_unrecognized"// the controller claims it as its own; most of the world does not accept it
  | "occupied"            // held by force, no claim of title that others accept
  | "contested";          // control itself is fighting over it (a front, a blockade, a landing)

interface TerritoryDef {
  id: string;                  // "ua_crimea", "ua_occupied_mainland", "tw_kinmen", ...
  name_key: string;
  de_jure: CountryId;          // the state whose territory it is in international law
  de_facto: CountryId;         // the state that holds it now
  status: RecognitionStatus;
  recognition: number;         // 0..1: the share of the world that accepts de_facto's title
  since: string;               // ISO date of the control baseline
  geometry: TerritoryGeometry; // authored, generalized, world scale; never traced from restricted maps
  light_profile?: number;      // night-light factor, art tuning, 0..1
  sources: string[];           // public, citable text assessments (docs/research)
}
```

A territory is never a country. Countries keep their de jure geometry (Crimea is Ukraine's in the
country atlas); territories are an overlay with their own ids, so selection, statistics and the
agencies of a country do not silently change when control does.

## How it is drawn

The convention of political atlases, in the game's palette:

1. Fill: the de facto controller's colour in the current map mode, so in every mode the territory
   reads as held by the controller (Russia's blue over Crimea when Russia is highlighted).
2. Recognition: a diagonal hatch in the de jure owner's colour over the fill. The lower the
   recognition, the denser and more visible the hatch: `annexed_unrecognized` a light hatch,
   `occupied` a denser one, `contested` a cross-hatch. A `recognized` territory has none.
3. The line: the de jure border stays solid; the edge of de facto control is dashed.
4. Night lights: the raster images are never edited; a territory may dim its lights by an authored
   profile, labelled as art tuning in its sources.
5. No text on the map. The selection panel and the tooltip say it in words: "Crimea: Ukraine's
   territory, held by Russia since 2014; annexation not recognized by most states."

## What the engine will do with it (later)

- The world state holds `territories: Record<TerritoryId, { de_facto, status, recognition }>`,
  seeded from content, saved, migrated.
- Events move control and recognition: a ceasefire freezes a line, an offensive moves it, a landing
  or a blockade makes a territory `contested`, a referendum or a treaty raises or lowers recognition.
  Scenario families (a Taiwan crisis, a Baltic crisis, a Gulf crisis) are dormant territory sets that
  an event wakes.
- Consequences read off the de facto controller: which agencies watch a site there, whose prices and
  export rules apply, which sanctions reach it; recognition feeds the risk of doing business there.
- An escaped model can be one of the forces: influence operations, a forged casus belli or a
  logistics disruption can nudge a crisis; the model can also profit from or suffer the fallout.

## Implementation notes (0.3.1, client)

To be written by the pass that implements the rendering.
