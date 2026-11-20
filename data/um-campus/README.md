# Universiti Malaya walking pilot

Open `/resident?area=um-campus`, search for Main Library, Dewan Kuliah 3, or Dewan Tunku Canselor, and compare the route options. The campus selection also includes mapped links to nearby places and transit within the pilot bounds.

The 20 November 2026 OpenStreetMap extract includes 2,513 pedestrian segments and 259 crossings. Of those segments, 479 record roof cover or a building passage. OpenStreetMap contributors provide the path geometry, building footprints, and place names under the ODbL. The UM campus map and Faculty of Science list help identify landmarks, including J04 Dewan Kuliah 3. [OpenStreetMap attribution and licence](https://www.openstreetmap.org/copyright) · [UM campus map](https://www.um.edu.my/campus-map) · [Faculty of Science building references](https://fs.um.edu.my/Committee/Lampiran%202%20-%20%20SOP%20Fire%20Emergency.pdf)

The rain-shelter route favours segments with recorded roof cover. Paths without cover data contribute zero recorded cover. A route uses the connected pedestrian network and honours the selected walking requirements. Any approximate approach to a building and gaps in mapped access appear in the route details. Building heights use mapped heights or floor counts where available and a visual estimate otherwise.

The mobile route comparison takes inspiration from Undercover’s separate shade and rain-shelter choices. Open-Meteo forecasts describe conditions for the area. [Undercover](https://undercover.gov.sg/) · [Open-Meteo Forecast API](https://open-meteo.com/en/docs)

## Rebuild the source bundle

- `npm run data:rebuild:um` builds offline from the committed, compressed Overpass response.
- `npm run data:refresh:um` downloads the documented campus bounding box and regenerates the source bundle. `sources.json` records the query, timestamp and SHA-256.
- `npm run db:setup` imports each area for the server app. Use a separate database when testing a refreshed graph after reports or field checks have been recorded, since those records reference the imported dataset.
- `npm run build:pages` exports the UM graph, walking places and GeoJSON path and place layers. The exported map uses local geometry, with no database dependency.
