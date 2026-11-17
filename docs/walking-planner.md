# Personal walking and verification guide

TownshipGo plans pedestrian journeys on the included local network. The first pilot is Elmina. A straight-line proximity match, an OpenStreetMap tag and an observed condition are different kinds of information; the planner preserves those distinctions.

## Try the features

1. Run the README setup commands, or `npm run db:setup` to upgrade an existing local database, then start the app.
2. Open `/resident`. Choose a destination and open **My walking needs**. Set the pace, maximum slope, crossing/surface requirements and total time budget. Wheelchair constraints remain enforced even when an optional personal setting is off.
3. Enable regular rests if needed, including the longest comfortable stretch and time spent resting. Backrests, armrests and shelter can be required. A missing usable seat produces a clear no-route result instead of an invented stop.
4. Choose a Malaysia departure time. The route compares shade by time of day and lighting at night. Open-Meteo forecasts are matched to that hour when available. Change the time to compare plans.
5. Use **What can I reach?** to find mapped everyday places within the same needs and budget. Include unmatched places to see the reason they were excluded.
6. Choose a destination entrance or let the planner select one. Expand **Why this route and what needs checking** to see arrival, planned rests and missing/expired path checks. **Leave now** also reloads the current observations and hazards.

There is no paid routing service or hosted database requirement. Walking needs are saved in browser storage and shared in the walk URL. A recipient can read those settings; avoid including private personal information in an observation or a shared link.

## Read the route bar

| Colour | Meaning | Behaviour |
| --- | --- | --- |
| Green | Selected needs are met and the relevant checks remain current for the trip. | Can be labelled best available among feasible options. |
| Yellow | A feasible route exists with missing, expired or uncertain evidence. | Lists what needs confirmation; being the best option never turns uncertainty green. |
| Red | No route was found meeting the selected requirements and budget, with a usable mapped access point. | Starting that route is disabled; the explanation identifies the unmet planning constraints. |

The bar is categorical, with labels/icons as well as colour. It is not a percentage safety score. Evidence coverage in the expanded explanation counts distinct path segments with all critical checks; it is separate from the personal suitability bar. The summary reports total trip minutes, planned verified rests, estimated uncovered metres and crossings not fully checked.

Critical path checks include passability, slope and surface. Step-free/wheelchair plans additionally require step information and kerb ramps at crossings. Crossings need a checked crossing type. Shade checks apply to the coolest mode in daylight, and lighting checks apply at night. A current entrance check covers availability, actual path connection, opening hours and step-free access when selected. Strict current-check-only routing rejects a yellow option.

## Record actual observations

Open `/verification` from the planner, home page or maintenance dashboard. This is a trusted local pilot workspace: the current prototype has no authenticated auditor roles. An auditor/team label records provenance; it does not establish an independently certified identity. Public multi-user verification and administrator access control need a separate implementation before public deployment.

**Map a place or facility.** Supply its name, category, coordinates and source reference. Use a map click or enter coordinates. Create the destination first, then create each entrance with that destination as its parent. Add real rest facilities, toilets, water points, shelters or transit stops when known. New community points are unverified. PostGIS suggests the nearest pedestrian path within 30 metres; this does not prove there is an unobstructed physical connection. Locations outside that threshold stay unattached and cannot produce a route.

**Choose a target and observed conditions.** The form supports paths, crossings, entrances and facilities. Leave unmeasured conditions blank. Record the time observed, reviewer/team, method, evidence reference and notes. A verified observation requires a review deadline after the observation and within one year. The form suggests 90 days; this is a configurable pilot assumption, not a research-derived validity period.

Useful checks include:

| Target | Structured conditions |
| --- | --- |
| Path | Open/passable, steps, measured slope, surface rating, roof cover, time-of-day shade, lighting |
| Crossing | Path conditions, crossing type/width, pedestrian green time, ramps, refuge |
| Entrance | Available, actual path connection, measured connector length, step-free access, hours |
| Rest facility | Available, actual path connection, seating/wheelchair space, step-free access, backrest, armrests, shelter, hours |
| Toilet/water | Facility access plus accessible toilet or drinking-water availability |

Surface values are 1 = good, 2 = uneven, 3 = broken. Shade and lighting inputs use percentages in the form and fractions from 0 to 1 in the API. A measured connector cannot be shorter than its geometric separation from the path. Opening-hour support is intentionally conservative: `24/7`, daily ranges such as `08:00-18:00`, and weekday ranges such as `Mo-Fr 08:00-18:00` (including overnight ranges). Unsupported holiday/complex rules remain unknown.

**Preserve history.** Every observation appends a `verification_records` row. For each individual field, the newest observed value takes precedence. Updating a backrest does not silently renew a seat's availability check. An expired verified value stays visible as overdue and cannot fall back to older proof. A newer reported blockage overrides an older positive check; reported information does not count as verified. OSM imports cannot be submitted as verified observations.

**Refresh the plan.** After saving, return to the resident page and press **Leave now**. The planner rejects known blocked/incompatible conditions, and checks opening hours and evidence against the trip times. Add records only for conditions actually checked. The initial database deliberately has no verification history and no invented benches.

## Routing and storage

The server exposes `GET /api/graph`, `/api/hazards` and `/api/walking-data` from PostgreSQL/PostGIS. The shared TypeScript journey engine runs on those records in the browser and in automated tests. `POST /api/assets` and `/api/verifications` validate and persist new records through Next.js routes. Database credentials remain server-only.

`walking_assets` stores separate destinations, entrances and facilities, their source and their path anchor. `verification_records` stores target type/id, status, method, observer, observed time, review deadline, references, notes and the individual measured fields. Schema updates are additive and idempotent. Seeding the same snapshot preserves observations/reports and uses stable external asset IDs to avoid duplicates. A different walking graph requires a separate database so observations keep their correct path IDs.

The journey engine splits path edges at mid-edge asset anchors. It searches over total cost, elapsed time and continuous time since rest, so it can choose a longer path that genuinely passes two checked seats. It accounts for walking to/from the seat, crossing waits and the chosen pause duration. A cheap-but-slow route cannot discard a faster option needed to meet the budget. Known pedestrian/accessibility blockers remain excluded. A start more than 50 metres from the network is rejected; a start connection longer than 3 metres is explicitly approximate and prevents green.

Rest routing requires current checks for availability, actual path connection and a seat, or wheelchair space for the wheelchair profile. Selected step-free, backrest, armrest and shelter requirements add their respective checks. A mapped bench alone cannot reset the rest interval. Entrance selection considers actual arrival hours and prefers a checked option that meets the budget. An explicitly selected incompatible entrance is not silently replaced.

## Estimates and pilot limits

- Travel time uses a chosen pace or mobility-profile estimate, crossing waits and explicit pauses. It is a planning estimate, without live progress tracking, traffic sensing or guarantees of personal exertion.
- The default 30-minute budget, 5-minute rest interval, 2-minute pause and slope limits are initial product settings. Residents can change them. They are not medical advice, universal accessibility certification or thresholds established by the supplied articles.
- Estimated uncovered distance is distance exposed to sun using mapped/modelled or observed shade for the departure slot. It is zero at night. The expanded view separately shows distance outside known roof cover, conservatively treating unknown cover as unsheltered. This is not a building-level sun simulation or a rain-protected-route guarantee.
- Shade/lighting cost comparisons use the departure time slot throughout the journey. Hourly forecasts cover the pilot area and the hours supplied by Open-Meteo; weather is unavailable outside those hours or during an outage. A forecast does not verify actual shelter or water availability.
- Only mapped destinations/facilities and paths count. No government, Geofabrik or external research dataset is downloaded automatically. The included OSM snapshot currently seeds two bridge destinations and their mapped access points; surveys and more destination/entrance mapping are still needed for useful neighbourhood coverage.
- The search is intended for a precinct-sized pedestrian graph. Imported nearest-path links require field checks; unmapped barriers, private access, changing conditions and a limited network can affect any route.

See [data sources](data-sources.md) for OSM provenance and import restrictions. The project reading list supplied by the owner includes the [UM walking study](https://ejournal.um.edu.my/index.php/jdbe/article/view/41031/15332), [IJERPH article](https://www.mdpi.com/1660-4601/20/3/2720), [KRI first/last mile work](https://www.krinstitute.org/publications/closing-the-first-and-last-mile-gap-in-greater-kuala-lumpur), [PNBRI ageing accessibility paper](https://www.pnb.com.my/sites/default/files/2026-02/PNBRI%20Views%2002-26%20Boosting%20Accessibility%20Enhancing%20Social%20Participation%20for%20the%20Ageing%20Community.pdf), [Penang/JB dataset article](https://www.sciencedirect.com/science/article/pii/S259012302502198X), [data.gov.my](https://data.gov.my/data-catalogue), [its static API guide](https://developer.data.gov.my/static-api/data-catalogue), [Senior Living Malaysia](https://seniorlivingmalaysia.org/care-insights/), [Geofabrik](https://download.geofabrik.de/asia/malaysia-singapore-brunei.html) and [KRI GKL mobility](https://www.krinstitute.org/publications/gklmob). These are retained as direction for later data sourcing and validation; this implementation does not claim calibrated findings from those publications.
