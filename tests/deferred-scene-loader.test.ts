import {describe,expect,it,vi} from 'vitest';
import {createDeferredModuleLoader} from '../src/lib/deferredModuleLoader';

function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

describe('deferred scene code loading',()=>{
 it('deduplicates concurrent requests and reuses fulfilled code identity without caching a mounted scene',async()=>{
  const gate=deferred<{default:()=>object}>(),importer=vi.fn(()=>gate.promise),loader=createDeferredModuleLoader(importer);
  expect(loader.peek()).toBeUndefined();
  const first=loader.load(),second=loader.load();expect(first).toBe(second);
  await Promise.resolve();expect(importer).toHaveBeenCalledOnce();
  const module={default:()=>({independentResource:true})};gate.resolve(module);
  expect(await first).toBe(module);expect(await second).toBe(module);expect(loader.peek()).toBe(module);
  expect(await loader.load()).toBe(module);expect(importer).toHaveBeenCalledOnce();
  expect(module.default()).not.toBe(module.default());
 });
 it('notifies all current failed requests, clears rejection and permits a genuine new import attempt',async()=>{
  const error=new Error('temporary module delivery failure'),module={default:()=>null};
  const importer=vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(module),loader=createDeferredModuleLoader(importer);
  const first=loader.load(),second=loader.load();
  expect(await Promise.allSettled([first,second])).toEqual([{status:'rejected',reason:error},{status:'rejected',reason:error}]);
  expect(loader.peek()).toBeUndefined();
  const retry=loader.load();expect(retry).not.toBe(first);expect(await retry).toBe(module);expect(importer).toHaveBeenCalledTimes(2);
 });
 it('converts a synchronous import failure into the same retryable promise contract',async()=>{
  const error=new Error('import unavailable'),module={default:()=>null},importer=vi.fn().mockImplementationOnce(()=>{throw error;}).mockResolvedValueOnce(module);
  const loader=createDeferredModuleLoader(importer);
  await expect(loader.load()).rejects.toBe(error);expect(loader.peek()).toBeUndefined();
  await expect(loader.load()).resolves.toBe(module);expect(importer).toHaveBeenCalledTimes(2);
 });
});
