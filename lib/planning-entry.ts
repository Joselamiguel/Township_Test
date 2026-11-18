import { dispatchPlan,type PlanningSnapshot,type PlanningCommand } from './planning-dispatch.ts';
const scope=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(message:unknown)=>void};
let snapshot:PlanningSnapshot|null=null;
scope.onmessage=(event:MessageEvent<{type:string;id:number;snapshot?:PlanningSnapshot;command?:PlanningCommand}>)=>{
    const message=event.data;
    if(message.type==='initialise'){snapshot=message.snapshot??null;return;}
    try { if(!snapshot||!message.command)throw Error('Walking data is not ready.');scope.postMessage({id:message.id,result:dispatchPlan(snapshot,message.command)}); }
    catch { scope.postMessage({id:message.id,error:'The walking search could not complete. Try a smaller budget or refresh the data.'}); }
};
