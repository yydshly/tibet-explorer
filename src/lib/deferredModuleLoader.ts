/** Share code downloads, never mounted components or resources. Failed imports
 * can be retried; each consumer owns cancellation of its own notification. */
export function createDeferredModuleLoader<T>(importModule:()=>Promise<T>){
 let loaded:T|undefined,fulfilled=false,pending:Promise<T>|undefined;
 return {
  peek:()=>loaded,
  load():Promise<T>{
   if(fulfilled)return Promise.resolve(loaded as T);
   if(pending)return pending;
   pending=Promise.resolve().then(importModule).then(value=>{
    loaded=value;fulfilled=true;pending=undefined;return value;
   },error=>{pending=undefined;throw error;});
   return pending;
  },
 };
}
