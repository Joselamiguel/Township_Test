# Walking environment and community design direction

The team's slides set the direction: combine pedestrian routing with local environmental conditions, personal requirements and community knowledge. The useful product question is **“Can I comfortably complete this walk at this time?”** Route distance, resting, the destination entrance, exposure and confidence all contribute to that decision.

## What this UI pass introduces

- A more visual landing page with a real, calculated Elmina sample walk. Example times come from the existing journey engine and are labelled as examples.
- A desktop planning workspace with a full map and a scrolling planning panel; the mobile map and bottom sheet remain available, along with large text, high contrast and reduced motion.
- Contextual walking conditions using the selected departure time and an actual Open-Meteo forecast when available. The UI can compare existing shade/lighting route modes; it does not claim live radar or storm avoidance.
- Information layers for the pedestrian network, shade records, roof cover, lighting and current field observations. Each segment distinguishes map information, community reports, dated checks, expired checks and unknown values.
- A route comfort breakdown that keeps exposure estimates, cover-data availability, planned rests and critical-check coverage separate from the red/yellow/green personal-suitability bar.

The current source snapshot has 602 pedestrian segments, with **no recorded shade, roof-cover or lighting values** and no seeded field observations. An information layer can therefore correctly display zero known segments. Gray means unknown, not an assertion that the path has no shade, cover or lighting. The route engine's fallback assumptions are not relabelled as environmental observations.

## Features and their prerequisites

| Team idea | Current foundation | Next useful step |
| --- | --- | --- |
| Weather-optimised walking | Hourly forecast, departure shade/lighting slots, personal pace and rest constraints | Collect path cover/canopy data, validate shade estimates, then evaluate explicit rain-aware route costs. |
| Spatial and satellite research | OSM pedestrian graph and retained geometry/source references | Evaluate licensed open imagery/land-cover datasets and document resolution, capture time and local limitations. |
| Dynamic lighting and safety layers | Mapped attributes, current field observations and reported hazards in the full server app | Survey functioning lights and crossings; define expiry periods and clearly identify the origin of each update. |
| Township infrastructure | Separate entrances, mapped facilities and pedestrian paths | Map actual shelters, benches, usable ramps, parks, bridges, toilets and connections; verify their availability. |
| Personal mode | Mobility profiles, individual requirements, saved preferences and accessible controls | Usability-test the redesigned flow with the intended walkers and refine labels, reach and information order. |
| Verified community alerts | Append-only field records and a shared maintenance queue in the server version | Add authenticated contributors/moderators, report freshness, duplicate handling and a separate corroboration signal. |
| Share My Walk | User-initiated sharing of the planned route and a phone-help action | Design explicit check-in consent and contact selection; use a reliable backend before promising unattended alerts. |

## Canopy and imagery

Treat Google Earth imagery as a research reference unless the intended integration and redistribution are covered by the applicable rights. OpenStreetMap is the walking network, not a complete source of measured canopy or heat conditions. Evaluate open Sentinel/Landsat imagery or land-cover products such as ESA WorldCover for the data pipeline, checking their licence, spatial resolution and suitability for the township.

Tree cover is not the same as usable shade on the footpath. A useful model also considers the time and season, tree/building geometry, covered structures and the walker's location. Record model provenance and validate predicted shade against site observations. Avoid presenting a vegetation overlay as a current or street-level shade measurement.

## Community support and verification

Votes can support prioritisation and corroboration, but popularity alone must not turn a hazard or crossing into a verified condition. Keep statuses such as **reported**, **community-supported**, **field-checked** and **review overdue** distinct. Preserve dated evidence and field-specific history. A newer blockage or expired check must not be hidden by an older positive observation or a large vote count.

The public GitHub Pages preview cannot provide shared writes, live crowdsourcing or background notifications. The Next.js → API routes → PostgreSQL/PostGIS version is the foundation for that work; its local verification workspace still needs authenticated roles before a public multi-user launch. No satellite, radar, crowdsourcing or notification service is added by this UI pass.

## Comfort and safety presentation

Keep the explainable personal-fit bar rather than inventing a universal numeric safety score. Show the relevant dimensions with units and uncertainty: estimated sun exposure, known cover information, measured/estimated slope, current crossing checks, rest intervals, usable entrances and opening hours. Blue/violet field-observation overlays indicate the presence of data; they do not certify a path as safe or passable.

Test unknown, stale, blocked and reported-only conditions as carefully as positive cases. Track actual-versus-estimated journey times, field-measured shade agreement, data coverage, and whether walkers can explain why a route was suggested. Use those results to tune the product's initial thresholds rather than claiming they were established by the supplied research.
