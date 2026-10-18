import {Children,isValidElement,type ReactElement,type ReactNode} from 'react';
import {describe,it,expect,vi} from 'vitest';
import TravelAccessSegments from '../src/components/TravelAccessSegments';
import {travelAccessSegments} from '../src/data/travelAccessSegments';
import type {TravelAccessCheck,TravelAccessDrafts} from '../src/lib/travelAccessVerification';

// Exercise controlled callbacks independently of the application director.
vi.mock('react',async()=>{const actual=await vi.importActual<typeof import('react')>('react');return {...actual,useId:()=>':access-test:',useState:(initial:unknown)=>[initial,vi.fn()]};});
type Props={children?:ReactNode;onClick?:()=>void;onChange?:(event:{target:{value:string};currentTarget?:{value:string}})=>void;onInput?:(event:{currentTarget:{value:string}})=>void;'data-review-key'?:string;placeholder?:string;id?:string};
function elements(node:ReactNode):ReactElement<Props>[] {
 if(!isValidElement(node))return [];
 const element=node as ReactElement<Props>;
 return [element,...Children.toArray(element.props.children).flatMap(elements)];
}
const id='mainling-nyingchi-s4';
const record:TravelAccessCheck={travelDate:'2026-10-30',checkedOn:'2026-10-16',source:'本人联系记录',sourceUrl:'',outcome:'needs-confirmation',notes:'入口未确认'};

describe('access record controls preserve draft and return focus identity',()=>{
 it('gives each map review its stable snapshot focus key and never saves during review',()=>{
  const onInspect=vi.fn(),onChange=vi.fn(),onDraftsChange=vi.fn();
  const tree=TravelAccessSegments({cityId:'nyingchi',onInspect,onChange,onDraftsChange});
  for(const segment of travelAccessSegments.nyingchi){
   const button=elements(tree).find(element=>element.props['data-review-key']===`access-segment-${segment.id}`);
   expect(button).toBeDefined();button!.props.onClick!();expect(onInspect).toHaveBeenLastCalledWith(segment);
  }
  expect(onChange).not.toHaveBeenCalled();expect(onDraftsChange).not.toHaveBeenCalled();
 });
 it.each([undefined,{...record,source:'尚未保存的修改',notes:'修改中的入口问题'}])('removing a saved record retains the current form as a draft',draft=>{
  const onChange=vi.fn(),onDraftsChange=vi.fn(),other={...record,notes:'另一地区保留'};
  const tree=TravelAccessSegments({cityId:'nyingchi',value:{[id]:record,'gunsa-shiquanhe-road':other},drafts:draft?{[id]:draft}:{},onChange,onDraftsChange});
  const remove=elements(tree).find(element=>element.type==='button'&&element.props.children==='移除保存记录');
  remove!.props.onClick!();
  expect(onDraftsChange).toHaveBeenCalledWith(expect.any(Function));
  expect(onDraftsChange.mock.calls[0][0](draft?{[id]:draft}:{})).toEqual({[id]:draft??record});
  expect(onChange).toHaveBeenCalledWith({'gunsa-shiquanhe-road':other});
 });
 it('typing changes only controlled drafts until explicit retain',()=>{
  const onChange=vi.fn(),onDraftsChange=vi.fn();
  const tree=TravelAccessSegments({cityId:'nyingchi',value:{[id]:record},drafts:{},onChange,onDraftsChange});
  const input=elements(tree).find(element=>element.type==='input'&&element.props.placeholder==='公告标题、发布单位或实际联系记录');
  input!.props.onChange!({target:{value:'未保存的新出处'}});
  expect(onDraftsChange).toHaveBeenCalledWith(expect.any(Function));
  expect(onDraftsChange.mock.calls[0][0]({})).toEqual({[id]:{...record,source:'未保存的新出处'}});expect(onChange).not.toHaveBeenCalled();
 });
 it('merges rapid different-field edits from one render without overwriting earlier fields',()=>{
  const onChange=vi.fn(),onDraftsChange=vi.fn();
  const tree=TravelAccessSegments({cityId:'nyingchi',value:{},drafts:{},onChange,onDraftsChange});
  const nodes=elements(tree);
  const change=(suffix:string,value:string)=>nodes.find(element=>element.props.id?.endsWith(`${id}-${suffix}`))!.props.onChange!({target:{value},currentTarget:{value}});
  // All callbacks retain the same initial rendered draft. React can batch the
  // parent updates; each action must read the latest queued previous state.
  change('travel','2026-11-03');change('checked','2026-10-16');change('source','快速填写的实际联系记录');change('notes','入口待确认');
  let queued:TravelAccessDrafts={'gunsa-shiquanhe-road':record};
  for(const [action] of onDraftsChange.mock.calls){expect(action).toEqual(expect.any(Function));queued=action(queued);}
  expect(queued[id]).toEqual({travelDate:'2026-11-03',checkedOn:'2026-10-16',source:'快速填写的实际联系记录',sourceUrl:'',outcome:'needs-confirmation',notes:'入口待确认'});
  expect(queued['gunsa-shiquanhe-road']).toBe(record);expect(onChange).not.toHaveBeenCalled();
 });
 it('records native date input events before a later text change rerenders the form',()=>{
  const onChange=vi.fn(),onDraftsChange=vi.fn();
  const nodes=elements(TravelAccessSegments({cityId:'nyingchi',value:{},drafts:{},onChange,onDraftsChange}));
  const travel=nodes.find(element=>element.props.id?.endsWith(`${id}-travel`))!;
  const checked=nodes.find(element=>element.props.id?.endsWith(`${id}-checked`))!;
  expect(travel.props.onInput).toEqual(expect.any(Function));expect(checked.props.onInput).toEqual(expect.any(Function));
  travel.props.onInput!({currentTarget:{value:'2027-06-10'}});
  checked.props.onInput!({currentTarget:{value:'2026-10-16'}});
  nodes.find(element=>element.props.id?.endsWith(`${id}-source`))!.props.onChange!({target:{value:'日期输入后填写出处'}});
  let queued:TravelAccessDrafts={};for(const [action] of onDraftsChange.mock.calls)queued=action(queued);
  expect(queued[id]).toMatchObject({travelDate:'2027-06-10',checkedOn:'2026-10-16',source:'日期输入后填写出处'});expect(onChange).not.toHaveBeenCalled();
 });
});
