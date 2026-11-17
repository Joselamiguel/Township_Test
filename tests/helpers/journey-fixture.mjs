export const AT = '2026-11-17T01:00:00.000Z';
export const nodes = [{ id: 1, lat: 3, lng: 101 }, { id: 2, lat: 3, lng: 101.001 }, { id: 3, lat: 3.0005, lng: 101.0005 }];
const edge = (id, a, b, length) => ({ id, from_node: a.id, to_node: b.id, length_m: length, name: `Path ${id}`,
    geometry: [[a.lng,a.lat],[b.lng,b.lat]], kind: 'footway', pedestrian_access: true, has_steps: false, slope_pct: 0,
    surface_rating: 1, is_crossing: false, crossing_type: null, crossing_width_m: null, ped_green_s: null, cycle_s: null,
    has_kerb_ramp: null, has_refuge: null, shade_morning: .8, shade_midday: .2, shade_afternoon: .9, shade_source: 'modelled', lit_ratio: 1, lighting_source: 'modelled', covered: false });
export const edges = [edge(1,nodes[0],nodes[1],120),edge(2,nodes[0],nodes[2],80),edge(3,nodes[2],nodes[1],80)];
export function asset(id, kind, edgeId, fraction, parent = null) {
    const e=edges.find(e=>e.id===edgeId);const p=e.geometry[0],q=e.geometry[1];
    const lng=p[0]+fraction*(q[0]-p[0]),lat=p[1]+fraction*(q[1]-p[1]);
    return { id:String(id),kind,parent_id:parent,name:`Test ${kind} ${id}`, category:'healthcare',external_id:null,
        lat,lng,source:'survey',source_ref:'Test fixture only',properties:{},edge_id:edgeId,edge_fraction:fraction,
        connection_distance_m:0,anchor_lat:lat,anchor_lng:lng };
}
export const destination=asset(100,'destination',1,1);
export const entrance=asset(101,'entrance',1,1,'100');
export const seat1=asset(201,'rest',2,.75);
export const seat2=asset(202,'rest',3,.25);
let serial=0;
export function record(type,id,attributes,extra={}) {
    return { id:String(++serial),target_type:type,target_id:String(id),status:'verified',observed_at:'2026-11-01T00:00:00Z',
        valid_until:'2026-12-01T00:00:00Z',reviewer:'Test audit team',method:'site_visit',source_ref:'Test fixture',notes:'',
        created_at:'2026-11-01T00:00:00Z',attributes,...extra };
}
export function data(verified=true) {
    return {assets:[destination,entrance,seat1,seat2],as_of:AT,verifications:!verified?[]:[
        ...edges.map(e=>record('path',e.id,{path_open:true,surface_rating:1,slope_pct:0,has_steps:false,
            shade_morning:.8,shade_midday:.2,shade_afternoon:.9,lit_ratio:1})),
        record('entrance',101,{available:true,path_connection:true,step_free:true,opening_hours:'24/7'}),
        ...[201,202].map(id=>record('facility',id,{available:true,path_connection:true,step_free:true,has_seat:true,wheelchair_space:true,opening_hours:'24/7'})),
    ]};
}
export const input=(needs={})=>({origin:[3,101],destination,profile:'senior',departure_at:AT,
    needs:{step_free:true,max_slope_pct:8,verified_only:false,require_rests:false,rest_interval_min:1,rest_duration_min:1,
        budget_min:15,speed_mps:1,avoid_uncontrolled_crossings:false,...needs}});
