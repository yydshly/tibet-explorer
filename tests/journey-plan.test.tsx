import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import JourneyPlan from '../src/components/JourneyPlan';
import {travelStops} from '../src/data/curriculum';
import {emptyExploration,type Exploration} from '../src/lib/store';

function renderPlan(stepId:string,values:Partial<Exploration>={}) {
 const saved={...emptyExploration(),...values};
 const setSaved=vi.fn(),onRead=vi.fn(),onPlanner=vi.fn(),onNotice=vi.fn();
 const html=renderToStaticMarkup(createElement(JourneyPlan,{stepId,saved,setSaved,onRead,onPlanner,onNotice}));
 return {html,saved,setSaved,onRead,onPlanner,onNotice};
}

function requiredMatch(html:string,pattern:RegExp) {
 const match=html.match(pattern);
 if(!match)throw new Error(`Missing expected markup: ${pattern}`);
 return match;
}

function decodeText(value:string) {
 return value.replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}

function routeItems(html:string) {
 const list=html.match(/<ol class="inline-route">([\s\S]*?)<\/ol>/)?.[1]??'';
 return [...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(match=>match[1]);
}

function textareaIn(html:string) {
 return decodeText(requiredMatch(html,/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/)[1]);
}

function escapeRegExp(value:string) {
 return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

function moveButton(item:string,name:string,direction:'前'|'后') {
 return requiredMatch(item,new RegExp(`<button\\b[^>]*aria-label="将${escapeRegExp(name)}向${direction}移动"[^>]*>`))[0];
}

function stop(id:string) {
 const item=travelStops.find(candidate=>candidate.id===id);
 if(!item)throw new Error(`Unknown test stop: ${id}`);
 return item;
}

describe('主题探索计划的真实候选与控件恢复',()=>{
 it('初次进入没有候选站，主题建议不会冒充已选站点',()=>{
  const {html}=renderPlan('T1');
  expect(html).toContain('我的候选顺序 · 0站');
  expect(html).toContain('<p class="plan-empty">还没有候选站点。先选一个认识目的，再加入相应地方。</p>');
  expect(routeItems(html)).toEqual([]);
  expect(html).not.toContain('<ol class="inline-route">');
  expect(html).toContain('加入这组候选站');
  expect(textareaIn(html)).toBe('');
 });

 it('实际站点按保存顺序显示，同一地区的不同站分别保留',()=>{
  const route=['tholing','lhasa-buildings','lhasa-old-town'];
  const {html}=renderPlan('T2',{route});
  const items=routeItems(html);
  expect(html).toContain('我的候选顺序 · 3站');
  expect(items).toHaveLength(3);
  expect(stop(route[1]).region).toBe(stop(route[2]).region);
  items.forEach((item,index)=>{
   expect(item).toContain(`<strong>${stop(route[index]).name}</strong>`);
   expect(item).toContain(`<span>${index+1}</span>`);
   expect(item).toContain(stop(route[index]).question);
  });
 });

 it('逐站观察笔记恢复到对应站点的 textarea，未填写的站点保持空白',()=>{
  const route=['lhasa-old-town','lhasa-buildings','nyingchi-valley'];
  const stopNotes={
   'lhasa-old-town':'先分清事件 & 遗存年代\n核对原文 <出处>',
   'nyingchi-valley':'观察“云雨”与坡面；保留天气日期。',
  };
  const items=routeItems(renderPlan('T2',{route,stopNotes}).html);
  expect(items.map(textareaIn)).toEqual([stopNotes['lhasa-old-town'],'',stopNotes['nyingchi-valley']]);
  for(const item of items)expect(item).toMatch(/<textarea\b[^>]*maxLength="1500"/);
 });

 it('入口的个人问题恢复到问题输入框，不借用逐站笔记',()=>{
  const note='为什么同一河谷中，水 & 道路参与不同生活？\n回来继续核对。';
  const {html}=renderPlan('T1',{note,stopNotes:{'lhasa-old-town':'这是另一站的观察'}});
  const questionField=requiredMatch(html,/<label class="plan-field">我还想继续理解什么？([\s\S]*?)<\/label>/)[1];
  expect(textareaIn(questionField)).toBe(note);
  expect(html).toContain('我的候选顺序 · 0站');
 });

 it('T3 日期、交通选中项和总笔记恢复到各自控件',()=>{
  const note='比较河谷与建筑使用。\n实际接驳与预约 <待核实>。';
  const {html}=renderPlan('T3',{route:['lhasa-buildings'],travelDate:'2026-11-09',transport:'混合交通',note});
  const dateInput=requiredMatch(html,/<input\b[^>]*type="date"[^>]*>/)[0];
  expect(dateInput).toContain('value="2026-11-09"');
  const select=requiredMatch(html,/<select\b[^>]*>([\s\S]*?)<\/select>/)[1];
  const selected=[...select.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)]
   .filter(match=>/\bselected(?:=|\s|$)/.test(match[1])).map(match=>decodeText(match[2]));
  expect(selected).toEqual(['混合交通']);
  const generalField=requiredMatch(html,/<label class="plan-field">这一程留下的认识与问题([\s\S]*?)<\/label>/)[1];
  expect(textareaIn(generalField)).toBe(note);
  expect(html).toContain('我的候选顺序 · 1站');
 });

 it('T3 空计划保留未定日期和交通意向，不由动画或默认值补齐',()=>{
  const {html}=renderPlan('T3');
  const dateInput=requiredMatch(html,/<input\b[^>]*type="date"[^>]*>/)[0];
  expect(dateInput).toContain('value=""');
  const select=requiredMatch(html,/<select\b[^>]*>([\s\S]*?)<\/select>/)[1];
  expect(select).toMatch(/<option value="" selected="">尚未确定<\/option>/);
  expect(html).toContain('我的候选顺序 · 0站');
  expect(routeItems(html)).toEqual([]);
  expect(textareaIn(html)).toBe('');
 });

 it('未知路线 ID 不计入候选，也不生成伪造站点或其笔记',()=>{
  const {html}=renderPlan('T2',{
   route:['unknown-before','lhasa-old-town','unknown-between','lhasa-buildings','unknown-after'],
   stopNotes:{'unknown-between':'不能成为虚构站点','lhasa-buildings':'记录建筑使用问题'},
  });
  const items=routeItems(html);
  expect(html).toContain('我的候选顺序 · 2站');
  expect(items).toHaveLength(2);
  expect(items[0]).toContain(`<strong>${stop('lhasa-old-town').name}</strong>`);
  expect(items[1]).toContain(`<strong>${stop('lhasa-buildings').name}</strong>`);
  expect(items.map(textareaIn)).toEqual(['','记录建筑使用问题']);
  expect(html).not.toContain('unknown-');
  expect(html).not.toContain('不能成为虚构站点');
  const unknownOnly=renderPlan('T2',{route:['unknown-only']}).html;
  expect(unknownOnly).toContain('我的候选顺序 · 0站');
  expect(unknownOnly).toContain('还没有候选站点');
 });

 it('移动按钮按可见候选顺序禁用两端，单站的两个方向均禁用',()=>{
  const route=['tholing','lhasa-buildings','lhasa-old-town'];
  const items=routeItems(renderPlan('T2',{route}).html);
  items.forEach((item,index)=>{
   expect(/\bdisabled(?:=|\s|>)/.test(moveButton(item,stop(route[index]).name,'前'))).toBe(index===0);
   expect(/\bdisabled(?:=|\s|>)/.test(moveButton(item,stop(route[index]).name,'后'))).toBe(index===items.length-1);
  });
  const only=routeItems(renderPlan('T2',{route:['tholing']}).html)[0];
  expect(moveButton(only,stop('tholing').name,'前')).toContain('disabled=""');
  expect(moveButton(only,stop('tholing').name,'后')).toContain('disabled=""');
 });

 it('T3 明确保持动态条件待核实，渲染不会完成出行、修改计划或触发保存通知',()=>{
  const values={route:['lhasa-buildings'],travelDate:'2026-11-09',transport:'公共交通',note:'准备继续核实'};
  const {html,saved,setSaved,onRead,onPlanner,onNotice}=renderPlan('T3',values);
  const status=decodeText(requiredMatch(html,/<p class="plan-status">([\s\S]*?)<\/p>/)[1]);
  expect(status).toContain('逐段交通、开放与预约仍需按日期核实');
  expect(status).toContain('历史开通报道不代表当前可用服务');
  expect(status).not.toMatch(/交通已核实|已确认开放|已完成旅行|已到访|通行保证/);
  expect(saved).toEqual({...emptyExploration(),...values});
  expect(saved.completed).toEqual([]);
  for(const action of [setSaved,onRead,onPlanner,onNotice])expect(action).not.toHaveBeenCalled();
 });
});
