import {useState} from 'react';
import {ArrowRight} from '@phosphor-icons/react';
import type {SceneSettings} from '../lib/store';

const changes=[
 {id:'weather',label:'几天 · 天气',layer:'moisture',title:'空气怎样移动，天气就怎样演变',cause:'空气运动会带来不同温度和水汽。气压系统、山地抬升与凝结等过程，参与形成一次云、雨、雪或晴天。',impact:'对西藏：相邻山地、迎风坡与背风侧可能出现不同天气；判断某次降水仍要看当时的观测与预报。'},
 {id:'season',label:'一年 · 季节',layer:'zones',title:'受热的年循环，与海陆和环流相互作用',cause:'地轴倾斜与绕日公转，使不同纬度的日照条件随一年改变。海陆受热差异、空气输送和地形，又把这种背景变成各地不同的季节。',impact:'对西藏：同属北温带，高地与河谷仍有差别；夏冬来流、水汽和积雪条件也会改变。纬度只是其中一项。'},
 {id:'climate',label:'多年 · 气候',layer:'surroundings',title:'多年统计的变化，要同时看驱动和证据',cause:'气候描述较长时期的天气统计。能量收支、温室气体、地表变化与自然波动等因素，可能改变这种统计；一次冷暖不能代表长期趋势。',impact:'对西藏：冰川、湖泊、生态和生活可能以不同方式响应。需要明确地点、年份与观测变量，才能讨论实际变化。'},
] as const;

export default function EarthEnvironmentPrimer({onChange,onMap}:{onChange:(patch:Partial<SceneSettings>)=>void;onMap:()=>void}){
 const [selected,setSelected]=useState<(typeof changes)[number]['id']>('season');
 const current=changes.find(item=>item.id===selected)!;
 return <section className="earth-environment-primer" aria-label="地球环境怎样影响西藏"><h2>地球上的变化，怎样影响这里？</h2><p className="earth-system-chain">纬度与海陆 → 能量和空气输送 → 高原与山地 → 地方差异</p><nav aria-label="区分变化的时间尺度">{changes.map(item=><button key={item.id} type="button" aria-pressed={selected===item.id} className={selected===item.id?'active':''} onClick={()=>{setSelected(item.id);onChange({layer:item.layer,selected:''});}}>{item.label}</button>)}</nav><article aria-live="polite"><h3>{current.title}</h3><p>{current.cause}</p><p>{current.impact}</p></article><small>球面用于辨认环境背景；变化机制在后续演示中展开。</small><button className="earth-impact-map" onClick={onMap}>把这些影响带回西藏整体地图<ArrowRight size={14}/></button></section>;
}
