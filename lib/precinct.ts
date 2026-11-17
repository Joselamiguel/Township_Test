// Sample places from the included Elmina OSM snapshot, all on one walking component.
// Update these together with the data source when the project moves to another precinct.
export const PRECINCT_NAME = 'City of Elmina';
// A real path node between the bridges keeps both demo walks within the default
// 30-minute budget, including the slower cane/walker profile, without skipping gaps.
export const DEFAULT_ORIGIN: [number, number] = [3.1767874, 101.50897]; // OSM node 8447864418
export const ORIGIN_LABEL = 'Elmina sample start';
export const DESTINATIONS = [
    {
        id: 'elmina_rainbow_bridge',
        osm_node_id: '8447859247',
        name: 'Jambatan Pelangi Elmina',
        coords: [3.175951, 101.5048067] as [number, number], // OSM node 8447859247
    },
    {
        id: 'elmina_iconic_bridge',
        osm_node_id: '8448010549',
        name: 'Iconic Bridge of Elmina City',
        coords: [3.1794588, 101.5132923] as [number, number], // OSM node 8448010549
    },
];
