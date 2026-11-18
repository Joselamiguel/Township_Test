'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import { dispatchPlan,type PlanningCommand,type PlanningSnapshot } from './planning-dispatch';
import { sitePath } from './site';

export function createPlanner(snapshot:PlanningSnapshot){
    let worker:Worker|null=null,id=0;const pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void;command:PlanningCommand}>();
    try { if(typeof Worker!=='undefined'){worker=new Worker(sitePath('/planning-worker/planning-entry.js'),{type:'module'});worker.postMessage({type:'initialise',snapshot});
        worker.onmessage=event=>{const request=pending.get(event.data.id);if(!request)return;pending.delete(event.data.id);if(event.data.error)request.reject(new Error(event.data.error));else request.resolve(event.data.result);};
        worker.onerror=()=>{worker?.terminate();worker=null;for(const request of pending.values()){try{request.resolve(dispatchPlan(snapshot,request.command));}catch{request.reject(new Error('Walking search unavailable.'));}}pending.clear();};
    }}catch{worker?.terminate();worker=null;}
    return {run:<T,>(command:PlanningCommand):Promise<T>=>worker?new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve:value=>resolve(value as T),reject,command});worker!.postMessage({id:requestId,type:'run',command});}):Promise.resolve().then(()=>dispatchPlan(snapshot,command) as T),
        close:()=>{worker?.terminate();for(const request of pending.values())request.reject(new Error('Search replaced.'));pending.clear();}};
}

export function usePlannerResult<T>(snapshot:PlanningSnapshot|null,command:PlanningCommand|null,enabled=true){
    const client=useRef<ReturnType<typeof createPlanner>|null>(null);
    const [state,setState]=useState<{snapshot:PlanningSnapshot;key:string;result:T|null;error:string}|null>(null);
    const key=JSON.stringify(command);
    const stableCommand=useMemo(()=>JSON.parse(key) as PlanningCommand|null,[key]);
    useEffect(()=>{if(!snapshot)return;const planner=createPlanner(snapshot);client.current=planner;return()=>{planner.close();client.current=null;};},[snapshot]);
    useEffect(()=>{if(!enabled||!snapshot||!stableCommand||!client.current)return;let cancelled=false;
        client.current.run<T>(stableCommand).then(result=>{if(!cancelled)setState({snapshot,key,result,error:''});}).catch(()=>{if(!cancelled)setState({snapshot,key,result:null,error:'The walking search could not complete. Refresh the data and try again.'});});
        return()=>{cancelled=true;};
    },[snapshot,stableCommand,key,enabled]);
    const current=state?.snapshot===snapshot&&state?.key===key;
    return {result:current?state.result:null,error:current?state.error:'',pending:!!enabled&&!!snapshot&&!!command&&!current,
        run:<R,>(request:PlanningCommand)=>{if(!client.current)return Promise.reject<R>(new Error('Walking data is not ready.'));return client.current.run<R>(request);}};
}
