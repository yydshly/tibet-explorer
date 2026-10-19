import {it,expect,vi} from 'vitest';
import LulangLifeStage from '../src/components/LulangLifeStage';
const find=(node:any,test:(n:any)=>boolean):any=>{if(!node||typeof node!=='object')return;if(test(node))return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,test);if(result)return result;}};
it('exposes real-photo objects to pointer and keyboard selection rather than hiding the interactive SVG',()=>{
 const onChange=vi.fn(),tree=LulangLifeStage({view:{mode:'place',progress:1,height:2500,connections:true,lookBack:false,placeMedia:'town',placePhoto:'town'},spatial:true,onChange,onBack:vi.fn()});
 const svg=find(tree,n=>n.type==='svg'&&n.props.className==='lulang-photo-marks');expect(svg.props['aria-hidden']).toBeUndefined();
 const road=find(svg,n=>n.props?.['aria-label']==='在同一地形观察道路');expect(road.props.role).toBe('button');expect(road.props.tabIndex).toBe(0);
 road.props.onClick();expect(onChange).toHaveBeenLastCalledWith({photoFocus:2});
 const preventDefault=vi.fn(),house=find(svg,n=>n.props?.['aria-label']==='在同一地形观察房屋');house.props.onKeyDown({key:'Enter',preventDefault});
 expect(preventDefault).toHaveBeenCalledOnce();expect(onChange).toHaveBeenLastCalledWith({photoFocus:3});
});
