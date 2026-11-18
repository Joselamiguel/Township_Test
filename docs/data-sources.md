# Walking data and provenance

For the new **Pasar Seni–Chinatown–Masjid Jamek primary pilot**, see [source acquisition and GIS review](pasar-seni-pilot.md). Its data pipeline is separate from the retained Elmina example described below. The first live KL source import remains blocked by the running cloud's download allowlist; no invented KL source data is included.

## Included source

`precinct.json` is an OpenStreetMap/Overpass JSON snapshot included in the repository. Its `timestamp_osm_base` is `2026-10-18T18:50:06Z`. Normal setup processes this local file; it does not contact an external routing API or download a new dataset.

OpenStreetMap data is available under the [Open Database Licence](https://www.openstreetmap.org/copyright). Preserve **© OpenStreetMap contributors** attribution and the applicable data-licence requirements when distributing derived data. The interactive map already includes contributor attribution.

The public tile layer follows the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Free data does not imply unlimited use of the public tile servers. Setup does not prefetch or bulk-download tiles.

## Pedestrian import policy

`scripts/osm-to-graph.mjs` includes:

- Dedicated `footway`, `path`, `pedestrian`, `steps` and mapped crossings.
- `cycleway`, `service` and `track` ways only when `foot=yes`, `foot=designated` or `foot=permissive` explicitly permits public walking.
- Ways with unspecified general access only when their way type already supports walking under this import policy.

It excludes road carriageways, prohibited or restricted foot access, and private/no general access unless there is an explicit public foot exception. General streets are excluded even when they have a permissive foot tag: separately mapped pedestrian paths or crossings are needed for the current prototype.

The imported graph contains 547 nodes, 602 pedestrian edges, 35 mapped crossings and one steps segment. It retains OSM way IDs, the source highway type and a pedestrian access flag. PostGIS stores actual point/line geometry and indexes it for spatial checks.

The router also rejects `street` edges and edges explicitly marked as inaccessible to pedestrians. Wheelchair and mobility profiles still apply their walking accessibility constraints to the permitted pedestrian network.

## Coverage and confidence

The original app used Universiti Malaya sample coordinates, but the included snapshot covers Elmina. `lib/precinct.ts` now uses Elmina OSM path node 8447864418 between two bridge destinations named in OSM, on the same walking component. Tests verify both sample walks fit the default 30-minute budget for all three mobility profiles. The earlier sample node required a long mapped detour and exceeded that budget. Routes cannot be inferred across a missing pedestrian link, and coverage outside this snapshot requires additional mapping.

Covered and lighting tags are weak hints marked `modelled`; unspecified shade, lighting, slope and surface attributes are not silently converted into audited observations. Routing fallback assumptions help compare walks but do not verify on-the-ground conditions. Resident reports are stored separately and affect subsequent route planning.

Structured observations now live in `verification_records`, separate from the OSM import and maintenance reports. Each checked field has an observation time, review deadline, method and observer label; missing and expired checks never become green just because a route is the best available option. `walking_assets` records real places, separate entrances and rest facilities. Initial setup seeds the two mapped bridge access points as unverified and does not invent benches or audits. See the [walking planner guide](walking-planner.md).

The original mixed-use `graph.json`, generated `graph.sql`, GeoJSON and shapefiles remain reference material. The normal importer does not load their road segments. Generated pedestrian output is written to `.local/pedestrian-graph.json`.

## Updating the source later

Supply a new Overpass `out geom` JSON file and point `npm run db:seed -- --source ...` at it in a separate database. Snapshot boundaries, missing paths and access tags all affect connectivity. Review the resulting network before adopting it for the project's next stage.

Edge IDs are deterministic for one dataset but can change when the dataset changes. A database fingerprint blocks a different import over existing edges, preserving the relationship between reports, audits and their original paths.
