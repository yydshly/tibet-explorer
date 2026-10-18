import {readFileSync} from 'node:fs';
import {Children,createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import type {CityLocalManifestPlace} from '../src/lib/cityLocalGeography';
const source=vi.hoisted(()=>({metadata:undefined as CityLocalManifestPlace|undefined}));
vi.mock('../src/hooks/useCityLocalData',()=>({useCityLocalData:()=>({metadata:source.metadata})}));
import CityLocalContext from '../src/components/CityLocalContext';
import {cityContinuityPartProgress} from '../src/lib/cityContinuityState';

const manifest=JSON.parse(readFileSync('public/data/local-places/manifest.json','utf8'));
type Props={children?:ReactNode;onClick?:()=>void;onToggle?:(event:{currentTarget:{open:boolean}})=>void};
function elements(node:ReactNode):ReactElement<Props>[]{if(!isValidElement(node))return [];const e=node as ReactElement<Props>;return [e,...Children.toArray(e.props.children).flatMap(elements)];}

describe('actual local data extent is visible without implying full-city or camera coverage',()=>{
 it.each([['lulang','nyingchi',2],['lhasa','lhasa',0],['shiquanhe','ngari',2]] as const)('%s keeps the archived bounds and acquisition date outside a collapsed disclosure',(locality,city,index)=>{
  source.metadata=manifest.places.find((p:CityLocalManifestPlace)=>p.id===locality);
  const metadata=source.metadata!,html=renderToStaticMarkup(createElement(CityLocalContext,{stage:'history',progress:cityContinuityPartProgress(city,index)}));
  const visible=html.split('<details')[0];
  expect(visible).toContain(metadata.acquiredAt.slice(0,10));
  expect(visible).toContain(`东经 ${metadata.bbox[0].toFixed(3)}°—${metadata.bbox[2].toFixed(3)}°`);
  expect(visible).toContain(`北纬 ${metadata.bbox[1].toFixed(3)}°—${metadata.bbox[3].toFixed(3)}°`);
  expect(visible).toContain('资料窗非完整市域');expect(visible).toContain('金框只提示地方位置');
  expect(html).toContain('不表示相机当前视野或城市边界');
 });
 it('airport/S4/G318 reading does not label the town bbox as the complete route extent',()=>{
  source.metadata=manifest.places.find((p:CityLocalManifestPlace)=>p.id==='lulang');
  const html=renderToStaticMarkup(createElement(CityLocalContext,{stage:'connections',progress:cityContinuityPartProgress('nyingchi',2)}));
  expect(html).toContain('源道路跨出城镇资料窗');expect(html).not.toContain('aria-label="现状地物资料窗口"');expect(html).not.toContain('东经 94.700');
 });
 it('reading geographical scope or following attribution pauses without seeking',()=>{
  source.metadata=manifest.places.find((p:CityLocalManifestPlace)=>p.id==='lulang');const onPause=vi.fn();
  const nodes=elements(CityLocalContext({stage:'history',progress:cityContinuityPartProgress('nyingchi',2),onPause}));
  expect(onPause).not.toHaveBeenCalled();const details=nodes.find(e=>e.type==='details')!;
  details.props.onToggle!({currentTarget:{open:true}});details.props.onToggle!({currentTarget:{open:false}});expect(onPause).toHaveBeenCalledOnce();
  nodes.find(e=>e.type==='a')!.props.onClick!();expect(onPause).toHaveBeenCalledTimes(2);
 });
});
