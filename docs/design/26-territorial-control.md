# SYS-26: Territorial control and recognition

Status: v0 design, 2026-09-30; the map rendering is v1 implemented (0.3.1, client, see the
implementation notes), from a data module in the client. The data moves into content and the world
state in a later engine pass (backlog P7).
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

The map draws every territory by the rules above from a data module in the client, 2026-09-30.
Nothing in the renderer knows Ukraine: a test-only island in the Taiwan Strait, held by one state
and claimed by another, is drawn by the same code as Crimea.

### Where it is

- `packages/ui/src/screens/game/map/territories.ts`: the model (`RecognitionStatus`,
  `TerritoryDef` field for field, `TerritoryGeometry`, `TerritoryLightProfile`), the list the map
  draws, and the rules as functions a test can hold: `hatchFor`, `dashedEdge`, `territoryPaint`,
  `territorySentence`.
- `ukraine-control.ts` (same folder): the two Ukrainian territories with their geometry, dates,
  recognition figures, light profiles and sources. It keeps its name, so the research note's links
  still reach it.
- `territory-geometry.ts`: each territory resolved against the decoded atlas. `topology.ts` gives
  a territory's atlas part to its de jure owner before any country path is drawn, which is the
  0.3.0 Crimea correction made general.
- `TerritoryLayers.tsx`: the clips, masks and patterns, the dimmed night lights and the overlay.

### How the model was filled in

- `TerritoryGeometry` is one of three shapes. `atlas_part` is a polygon the atlas already draws on
  its own, found by a point inside it (Crimea); `envelope` is an authored outline clipped to the
  owner's land less the parts other territories take, with `as_of` dating the line (the occupied
  mainland, 2026-09-28); `polygon` is an authored shape drawn as it is, for land the atlas is too
  coarse to carry (the test island).
- `since` is the date the holder has held the territory from, which the sentence prints as a year:
  Crimea 2014-03-18; the occupied mainland 2022-02-24, a generalization, since the Donetsk and
  Luhansk cores have been held by Russia and its proxies since 2014. A scenario that needs the
  difference splits the envelope into two territories. The date of the drawn line is the
  envelope's `as_of`, which the About window prints.
- `recognition` is an upper bound, the share of the 193 UN members that voted against the General
  Assembly resolution upholding Ukraine's territorial integrity: Crimea 0.06 (A/RES/68/262, 27 March
  2014, 100 to 11 with 58 abstentions), the occupied mainland 0.03 (A/RES/ES-11/4, 12 October 2022,
  143 to 5 with 35 abstentions). Both sources are in the territories' `sources`, and the research
  note (`docs/research/ukraine-map-2026-09.md`, "Recognition figures") says why the figure is a
  bound.
- `light_profile` is the territory's own factor (Crimea 1, the occupied mainland 0.25). The finer
  footprints of 0.3.0 (the Donetsk-Luhansk cluster, the city cores, the destroyed ones) are a
  separate list keyed by territory id, evaluated in order, the last match replacing, so
  `TerritoryDef` keeps its shape.

### The drawing, as built

1. Fill: the holder's fill in the current map mode, the same colour its own country path gets. The
   owner's path is masked out under its territories, so a translucent owner colour does not tint
   the holder's, and the owner's border is drawn again over the territory, so the de jure border
   stays solid on top of the hatch.
2. Hatch: lines at 45 degrees, spaced in screen pixels at every zoom and window size (the pattern
   is recomputed from the map's drawn size and zoom). The status picks the tier and the figure
   tightens it: `disputed` 11 px at 0.50, `annexed_unrecognized` 8 px at 0.62, `occupied` 4.5 px at
   0.78, `contested` a cross-hatch at 5.5 px and 0.85, `recognized` none; inside a tier the spacing
   grows by up to half and the opacity falls by up to a quarter as recognition rises from none to
   all. Crimea (0.06) is drawn at 8.2 px, the occupied mainland (0.03) at 4.6 px.
3. The hatch's colour is the owner's hue drawn solid. Where the owner has no hue in the mode (an
   unfilled country on the textured map) or shares the holder's (the same category, or any scale
   mode, where only the intensity differs), it is the map's line colour instead: the border colour
   on the textured map, the secondary text colour on the flat one. A territory the world does not
   accept therefore never looks accepted because two colours happened to agree.
4. The edge of control: the territory's outline, dashed, drawn only over the owner's land that is
   not held by the same holder. The front line of the occupied mainland is dashed; the line between
   Crimea and the mainland, both held by Russia, is not an edge of control and gets no dash.
5. Night lights: as 0.3.0, a black layer under the country paths whose opacity is one minus the
   factor, inside the territory's drawn shape, with the finer profiles replacing the territory's
   own factor where they apply. Crimea keeps the original lights.
6. Words: the territory's filled outline is the hit target. Its tooltip (the `<title>` the country
   paths use too) is the sentence, a click or Enter selects the de jure owner with the territory
   named (`Selection.territory`), and the selection panel prints the sentence under the country's
   name. The sentence is one template per status with the recognition in three bands (almost no
   state below 0.1, a minority below 0.5, most). The Russian templates put every name after a
   colon, in the nominative (SYS-14 ru, R4): "Крым. Территория: Украина. Под контролем: Россия,
   с 2014 года. Аннексию признают лишь единичные государства."

### How it reads

- The default textured map with neither country filled: Crimea and the occupied mainland carry a
  light and a denser hatch in the border colour with the front dashed, the mainland's lights
  dimmed; the rest of Ukraine is the plain raster.
- With Russia filled, as in the maintainer's run where presence paints it blue: both territories
  are Russia's blue, Crimea lightly striped and the mainland densely, the rest of Ukraine unfilled.
- Filled categorical modes (stance, government): Russia's category colour with Ukraine's category
  colour as the hatch; where the two share a category the hatch is the line colour.
- Scale modes: the holder's intensity with the line-colour hatch.
- The flat vector map: the same rules on the flat land colour, with the lighter line colour.

### Fail-soft

A territory whose geometry cannot be resolved (an atlas that does not separate the part, or would
have to give away its holder's largest polygon; an owner the atlas does not draw) is left off with
one console warning, and the map and every other territory are drawn as before. In 0.3.0 a missing
Crimea turned all the layers off.

### A correction to the geometry

The envelope's southern closing edge ran at 46 N. It left the atlas's strip of mainland beside
Crimea, the Perekop and Arabat approaches down to 45.74 N, outside the envelope, which the brown
wash hid and the new fill showed as a sliver in Ukraine's colour. The edge runs at 45.6 N now,
over sea and over Crimea, which the clip excludes, so it still carries no control meaning; the two
approaches are anchors in the tests.

### Tests

`packages/ui/test/territories.test.tsx`: the rules per status, the density by recognition, the
paint, the sentences in English and Russian, Crimea drawn and selecting Ukraine with the territory
named, the owner's fill cut under its territories, and the Taiwan Strait island drawn by the same
code path. `packages/ui/test/ukraine-control.test.ts`: the city anchors (Bakhmut and Soledar among
them, and the two approaches above), the light profiles, and Crimea drawn from its atlas polygon
with the mainland's envelope kept off it. In the browser, `packages/ui/e2e/control-room.spec.ts`
finds Crimea under the pointer, reads its tooltip and checks the selection panel names it.

### Left for later

- The list moves into content and the world state with the engine pass (backlog P7); the client
  would then read `TerritoryDef` from the bundle unchanged.
