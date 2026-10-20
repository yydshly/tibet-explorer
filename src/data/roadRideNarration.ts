/** Only the opt-in 1.8 km ride. Distances are source-chain fractions, not
 * actual vehicle time. Geometry supports turns/height; road finish is schematic. */
export const roadRideCues=[
 {id:'RIDE-G318-surface',stepId:'RIDE-G318',chapterId:'route-ride',title:'从道路进入山坡',narration:'沿这段道路向前。现在能看清路面和两侧坡面的关系。道路走向来自地图资料，路面的宽度和外观是示意，不代表实测道路。'},
 {id:'RIDE-G318-rise',stepId:'RIDE-G318',chapterId:'route-ride',title:'道路位置与高差',narration:'继续前进，注意路面沿着山坡延伸。地表高度在变化，山坡也会遮挡前方。这里展示的是地表采样，不是道路工程的纵坡测量。'},
 {id:'RIDE-G318-turn',stepId:'RIDE-G318',chapterId:'route-ride',title:'转弯时视野变化',narration:'接近这几处转弯。跟着路面转向，前方与侧面的山坡会交替进入视野。可以暂停回望，比较同一位置朝不同方向看到的地形。'},
 {id:'RIDE-G318-arrive',stepId:'RIDE-G318',chapterId:'route-ride',title:'到达记录附近',narration:'前面到达沿路照片的拍摄位置附近。三维场景帮助认识道路和山坡，接下来用有日期的实拍辨认路边风景，两者不是同一机位的连续录像。'},
] as const;
export const roadRideBeats=roadRideCues.map(c=>({id:c.id,recordingId:c.id,text:c.narration,sceneIdentity:'road-ride'}));
export const roadRideStops=[0,.34,.75,.94,1] as const;
export function rideFraction(index:number,textProgress:number){const i=Math.max(0,Math.min(3,index));return roadRideStops[i]+(roadRideStops[i+1]-roadRideStops[i])*Math.max(0,Math.min(1,textProgress));}
export function rideSeekTarget(fraction:number){const f=Math.max(0,Math.min(1,fraction));const index=f>=.94?3:f>=.75?2:f>=.34?1:0;return {index,textProgress:(f-roadRideStops[index])/(roadRideStops[index+1]-roadRideStops[index])};}
