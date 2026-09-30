# Ukraine map: dated control generalization and night-light profiles

Date of this implementation note: 2026-09-29; updated 2026-09-30 for release 0.3.1.
Frozen control baseline: **2026-09-28**.
Geometry kind: **authored-generalization**, intended for the game's 1:110m world map.
Data: [ukraine-control.ts](../../packages/ui/src/screens/game/map/ukraine-control.ts), the two
territories of SYS-26 (Crimea and the occupied mainland) with their dates, recognition figures,
light profiles and sources. Drawing: `territories.ts`, `territory-geometry.ts` and
`TerritoryLayers.tsx` in the same folder.
Contracts: [SYS-26 "Territorial control and recognition"](../design/26-territorial-control.md)
for how control and recognition are drawn since 0.3.1, and
[SYS-11 "Control room (0.3.0)"](../design/11-notifications-and-ui.md#control-room-030) for the
first version of the layer.

## What the overlay means

The sovereign-country target is Ukraine, including Crimea. A separate visual layer indicates
broad areas of Russian control in the frozen scenario. It does not change country selection,
the country's internationally recognized extent, or the ownership of a game site.

The control envelope is independently drawn for this game. Its coarse coordinates are editorial
interpolations between general river/city anchors supported by the dated publications below.
They are not observations of every point along the boundary. No ISW or DeepState shape, tile,
SVG path, API geometry or mirrored dataset was copied or traced into this file.

This is not an exact live frontline, a claim of complete coverage of every occupied pocket,
or a forecast of the war in January 2027. Small northern border pockets, river islands,
contested areas and local advances are unresolved. No entire oblast is used as a proxy for
control. The southeastern closing edges extend into sea and foreign land only to close the
mask: the renderer intersects it with Ukraine's land and excludes the separate Crimea
geometry. Those closing edges are not geographic claims. Since 0.3.1 the southern closing edge
runs at 45.6 N rather than 46 N (see "Known generalization errors" below).

The map itself carries no political explanatory text, as requested: no label, title or legend is
drawn on the land. Since 0.3.1 each territory's filled outline is a pointer target. Its tooltip
and the selection panel print one sentence built from the data (the territory's name, whose
territory it is, who holds it and since which year, and how few states accept that, in three
bands), and a click still selects Ukraine, with the territory named. The About window credits the
control layer with its baseline date and its sources, and says the night lights there are dimmed
by hand. This document and the source comments hold the remaining source limitations.

## Public facts used as anchors

- The [CTP/ISW assessment of 28 September 2026](https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-september-28-2026)
  describes Donetsk, Makiivka, Mariupol and Crimea as occupied. Its reports of a Russian effort
  to advance on Slovyansk, Kramatorsk and Kostiantynivka, of Russian attempts to seize Lyman
  against Ukrainian counter-operations in that direction, and of a recent Ukrainian advance
  southeast of Orikhiv rule out treating the entirety of Donetsk or Zaporizhzhia oblast as
  Russian-controlled. It describes Huliaipole and Kupiansk as held by Ukraine under attack and
  Chasiv Yar as contested.
- The [CTP/ISW assessment of 25 September 2026](https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-september-25-2026)
  describes the southern land corridor to occupied Crimea, the Tokmak area, operations near
  the lower Dnipro, and unconfirmed rather than consolidated changes around Orikhiv.
  Those general areas inform the broad envelope; individual military locations are not
  represented in the game.
- The [27 September 2026 assessment](https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-september-27-2026)
  identifies Luhansk City within occupied Luhansk territory. Its text was available through
  indexed search during this pass; a direct page request subsequently returned HTTP 403.
  This retrieval limit is retained rather than presented as a successfully reopened page.
- [Mission Eurasia's report dated 11 September 2026](https://totinsights.org/briefings/confiscation_religious_property.html),
  hosted with the author's permission by TOT Insights, documents occupation administration
  and property seizures in Melitopol. It provides an independent civilian anchor for
  including the city in the occupied southern corridor.
- The [UK and partners' statement of 21 September 2026](https://www.gov.uk/government/news/joint-statement-on-russias-sham-elections-in-ukraines-temporarily-occupied-territories)
  distinguishes occupation from sovereignty and identifies the affected Ukrainian territories.
  Its reference to oblasts is not a claim that their entire areas are occupied.

The data tests include Donetsk, Makiivka, Luhansk, Mariupol and Melitopol, and exclude Kyiv,
Kharkiv, Dnipro, Zaporizhzhia, Kherson city, Kramatorsk, Slovyansk, Lyman and Orikhiv.
These tests guard gross editorial and coordinate mistakes. They do not independently validate
the interpolated frontier between cities or prove an exact area figure.

On 2026-09-30 the 25 and 28 September assessments, the UK and partners' statement and the
Mission Eurasia report were reopened and say what is cited above. The 27 September assessment
and ISW's policy page both answered HTTP 403 to a direct request that day, so their wording
rests on the earlier pass.

## Why existing map geometry needs a separate Crimea correction

The installed world-atlas 110m Russia MultiPolygon includes a distinct Crimean component.
In world-atlas 2.0.2 it is the twelfth component, with 18 ring points (the closing point
included) and bounds 32.45 to 36.53 degrees east, 44.36 to 46.22 degrees north; this was
re-checked on 2026-09-30. Both Simferopol and Sevastopol are inside Russia's decoded geometry
and outside Ukraine's, whose 110m geometry is a single polygon.

The client corrects this in `countryShapes()` (`packages/ui/src/screens/game/map/topology.ts`):
it finds the component with a Crimean seed point and a bounds check, removes it from Russia and
adds it to Ukraine before any country path is built, so hovering and selecting Crimea name
Ukraine. The component's array index is an observation, not an API contract. Since 0.3.1 the
correction is general (SYS-26): `topology.ts` gives any territory's atlas part to its de jure
owner, and the same polygon draws the territory `ua_crimea`, held by Russia. If a later atlas
stops exposing Crimea as a separable polygon, that territory is left off with one console warning
and the rest of the map is drawn as before; the old border is never drawn.

Natural Earth is [public-domain data](https://www.naturalearthdata.com/about/terms-of-use/).
The original day and night JPEG files stay byte-for-byte unchanged. The source atlas files
are also retained; the correction is applied to decoded runtime geometry.

## Recognition figures

SYS-26 gives each territory a `recognition` value from 0 to 1 that sets how dense its hatch is.
There is no count of states that formally recognize either change, so the figure is an upper
bound on acceptance: the share of the 193 UN members that voted against the General Assembly
resolution upholding Ukraine's territorial integrity.

| Territory | Resolution | Vote (for, against, abstaining) | Figure |
|---|---|---|---:|
| Crimea | A/RES/68/262, 27 March 2014 | 100, 11, 58 | 11 / 193 = 0.057, stored as 0.06 |
| Occupied mainland | A/RES/ES-11/4, 12 October 2022 | 143, 5, 35 | 5 / 193 = 0.026, stored as 0.03 |

Sources: [UN News, 27 March 2014](https://news.un.org/en/story/2014/03/464812) and
[UN News, 12 October 2022](https://news.un.org/en/story/2022/10/1129492), both reopened on
2026-09-30 and stating these votes. The UN Digital Library record of the 2014 resolution
(https://digitallibrary.un.org/record/767565) and the UN press pages answered a direct request
that day with HTTP 403 or a browser challenge, so they are listed as references, not as pages
reread. An abstention is not counted as acceptance and a vote against is not a recognition, which
is why the figure is a bound and why the game prints it only as a band ("almost no state").

The `since` dates: Crimea 2014-03-18, the day Russia declared the annexation. The occupied
mainland 2022-02-24, the start of the full-scale invasion; this generalizes two histories, since
the Donetsk and Luhansk cores have been held by Russia and its proxies since 2014. A scenario that
needs the difference splits the envelope into two territories.

## Sources deliberately not imported as control polygons

[ISW's policy, revised 8 January 2026](https://understandingwar.org/fair-use-and-attribution-policy/)
requires written permission for incorporating or modifying its map/data materials in other
systems. Public availability of an ArcGIS service does not establish redistribution permission.

[DeepState's licence](https://deepstatemap.live/license.html), dated 3 September 2025,
allows credited visual material while placing separate conditions on its API.
A third-party GitHub mirror's licence does not replace those primary conditions.
No mirror was used as a way around them.

The Commons [general invasion SVG](https://commons.wikimedia.org/wiki/File:2022_Russian_invasion_of_Ukraine.svg)
is offered under CC BY-SA 4.0, but its visible 24 April 2026 file update does not establish
that its entire control boundary describes that day. Explicit geographic registration was
not found in the inspected SVG, so it is not a ready-to-use GeoJSON baseline.

The Commons [Donbas map](https://commons.wikimedia.org/wiki/File:Map_of_the_war_in_Donbass.svg)
has a 9 September 2026 update, but the prior editor explicitly acknowledged uncertainty and
an outdated frontline when adding approximate gray areas. A recent file timestamp is not
evidence of a verified contemporary control boundary. Neither Commons file was imported.

## Lighting is a separate visual model

All values below are **initial art tuning relative to the existing night texture**. They are
not NASA radiance measurements, population ratios, measured electrification rates, or exact
conditions on the control baseline date. Control and brightness have independent meanings.

| Profile | Absolute light factor | Why the visual profile exists |
|---|---:|---|
| Occupied mainland default | 0.25 | Authored regional dimming requested for the scenario |
| Donetsk-Luhansk cluster | 0.45 | The request keeps the industrial cluster brighter than the rest of the occupied mainland; a coarse band around the Donetsk-Horlivka-Yenakiieve and Alchevsk-Luhansk urban chain; art tuning |
| Donetsk-Makiivka urban core | 0.55 | Preserves a dimmed major urban core within the broader regional profile |
| Luhansk urban core | 0.60 | Preserves a separate dimmed urban core |
| Mariupol damaged core | 0.12 | Historical severe destruction supports distinguishing the core; the coefficient is not inferred from a destruction percentage |
| Bakhmut damaged core | 0.05 | Historical near-total destruction motivates a smaller visual residual |
| Avdiivka damaged core | 0.05 | Historical near-total destruction motivates a smaller visual residual |
| Crimea | 1.00 | Explicit maintainer choice to retain the original baseline lights |

The profiles are applied in source order: **the last matching profile replaces the earlier
factor**. Thus Donetsk is 0.55 of the original lights, not 0.25 multiplied by 0.55.
The small damaged-core masks can override the larger urban mask. Every mainland profile
must also be clipped to the occupied mainland and Ukrainian land. Crimea is excluded and
handled separately.

Urban masks are coarse visual octagons around city cores. They are not municipal boundaries,
surveyed footprints of damage, individual industrial facilities or exact extents of the
built environment. No special brightening override is assigned to Melitopol or Berdyansk:
this pass did not establish a defensible comparative light level for them.

### What supports qualitative differentiation

[NASA's Ukraine night-light analysis, published 29 June 2022](https://science.nasa.gov/earth/earth-observatory/tracking-night-lights-in-ukraine-150002/)
observed both losses and partial restoration of lighting during January-May 2022.
It identifies damage to energy infrastructure and deliberate reductions in outdoor lighting
as relevant causes. Those observations do not establish a fixed relationship with population,
nor current coefficients for 2026.

[OHCHR's report for 24 February-15 May 2022](https://www.ohchr.org/sites/default/files/documents/countries/ua/2022-06-29/2022-06-UkraineArmedAttack-EN.pdf),
paragraph 43, reports extensive housing destruction in Mariupol. The direct PDF retrieval
failed in this pass; its text was available through the indexed primary document.
[UN meeting coverage of 28 October 2022](https://press.un.org/en/2022/gashc4361.doc.htm)
also records the scale of the city's housing damage.
A percentage of damaged buildings is not used as a percentage of extinguished lights.

The [UN Secretary-General's statement of 18 November 2024](https://press.un.org/en/2024/sgsm22462.doc.htm)
describes the near-total destruction of Bakhmut and Avdiivka among other towns.
These historical reports justify a differentiated visual treatment, not a measured 2026
night-light estimate. Reconstruction, changing power supply and intentional lighting policies
could alter actual brightness substantially after the dates of those reports.

The Crimea factor is a user-directed presentation choice. It must not be described as evidence
that Crimea experienced no power interruptions or physical damage.

## Satellite calibration that remains to be done

A quantitative update should use [NASA VNP46A3 collection 2](https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/VNP46A3):
monthly, lunar-BRDF/atmosphere-corrected radiance with snow-free composites, quality flags,
observation counts and variation estimates. Compare equivalent seasons and the same valid
pixels; exclude background, missing observations and unsuitable-quality retrievals.
Retain the chosen baseline month, current month, sample coverage and uncertainty in the data.

[NASA's uncertainty study](https://ntrs.nasa.gov/citations/20210017813) identifies important
effects from atmosphere and view geometry, as well as cloud/snow classification and seasonal
conditions. A few unfiltered screenshots do not give a reliable population or power-supply ratio.

The open [GIBS WMS capabilities](https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0)
were inspected on 29 September 2026. They declared:

- VIIRS_Black_Marble and VIIRS_Night_Lights: 2012 and 2016 composites only.
- VIIRS_SNPP_GapFilled_BRDF_Corrected_DayNightBand_Radiance: daily coverage through 27 September 2026.
- VIIRS_NOAA20_GapFilled_BRDF_Corrected_DayNightBand_Radiance: daily coverage through 28 September 2026.

No monthly VNP46A3 layer was found in that WMS. Requesting TIME=2026 from the static 2016 layer
does not turn it into contemporary imagery. Corrected daily WMS images still do not supply
the complete quality/observation information needed for the proposed regional statistics.
The [World Bank BlackMarblePy workflow](https://worldbank.github.io/blackmarblepy/notebooks/blackmarblepy.html)
can retrieve the science products with an Earthdata token. Those regional radiance calculations
have not been performed for this implementation.

## Rendering and acceptance checks

The source rasters and vectors share the same equirectangular 1000 by 500 map coordinates.

Control (since 0.3.1, SYS-26; `TerritoryLayers.tsx`). 0.3.0 drew a brown wash over the occupied
land, which the maintainer read as dirt rather than as control (playtest 10, V1). Now each
territory is filled with its holder's colour in the current map mode, the same fill Russia's own
path gets, and hatched at 45 degrees in the de jure owner's colour, or in the map's line colour
where the owner has no colour of its own in that mode or shares the holder's. The hatch spacing is
kept in screen pixels at every zoom: Crimea, annexed and not recognized, 8.2 px and light; the
occupied mainland 4.6 px and dense. The territory's outline is dashed only where it cuts
Ukraine's land that the same holder does not hold, so the front is dashed and the line between
Crimea and the mainland is not; Ukraine's border is drawn again on top and stays solid. When the
current mode leaves both countries unfilled (the default textured map), the fill is the raster
itself and only the hatch and the dashed front show.

Night lights. The dimming is a black layer between the night raster and the country paths whose
opacity is one minus the profile's factor, inside the current night mask, so every pixel of the
night texture keeps that share of its light and the day side is untouched. Reducing the opacity of
the whole night image would expose the day texture; a uniform dark region would dim terrain too.
The same layers are drawn on the horizontally wrapped copy of the map.

In the vector theme there is no raster night-light signal to attenuate. Political contours,
selection strokes and gameplay markers must remain readable; the hatch uses the flat map's
lighter line colour there.

The geometry file uses clockwise exterior rings for d3-geo's small-polygon convention.
If exported as RFC 7946 GeoJSON elsewhere, winding must be handled for the target consumer.
Tests check city anchors, ring closure, small spherical area, and negative controls far from
Ukraine to catch accidental globe-complement polygons. The two JPEG textures are byte-identical
to release 0.2.0 by git. Selecting Crimea selects Ukraine, checked by "selecting Crimea" in
`packages/ui/test/ukraine-control.test.ts` and by "the borrowed window and the map's control
layer" in `packages/ui/e2e/control-room.spec.ts`; day and night and wrapped and zoomed views are
browser acceptance items. Passing data tests does not certify a current military map.

### Known generalization errors (2026-09-30, both corrected the same day)

Bakhmut. The envelope's edge from 37.85 E, 48.50 N to 38.15 E, 48.72 N runs through Bakhmut and just
south of Soledar, both under Russian control since 2023, so the northern half of the Bakhmut
light profile falls outside the clip and stays at full brightness. At the map's largest zoom the
error is a few pixels. Corrected: the edge now runs from 37.8 E, 48.53 N to 38.1 E, 48.77 N in
`packages/ui/src/screens/game/map/ukraine-control.ts`, and Bakhmut (38.0 E, 48.5947 N) and
Soledar (38.0903 E, 48.6817 N) are positive anchors in `packages/ui/test/ukraine-control.test.ts`.

Southern closing edge. The envelope's southern closing edge ran at 46 N. It left the atlas's strip
of mainland beside Crimea, the Perekop and Arabat approaches, held since 2022 and reaching down to
45.74 N in the 1:110m geometry, outside the envelope. The 0.3.0 wash hid the sliver; the 0.3.1 fill
showed it in Ukraine's colour. The edge now runs at 45.6 N, over sea and over Crimea, which the
clip excludes, so it still carries no control meaning; the two approaches are positive anchors in
`packages/ui/test/ukraine-control.test.ts`.
