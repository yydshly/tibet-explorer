import type {LulangPhotoId} from './lulangLife';

/** Optional field-photo readings; not appended to the four route beats or six chapters. */
export const lulangPhotoReadings:Record<LulangPhotoId,{narration:string;marks:readonly [string,number][]}>={
 forest:{narration:'先看林地坡面，林木沿山体起伏铺开。再看开敞地，它们穿插在林木之间。远近层次使山谷产生遮挡和纵深。这是二零零八年的鲁朗林海照片；风景是具体记录，单张照片不能解释全年气候。',marks:[['林地坡面',1],['开敞地',2],['远近层次',3]]},
 meadow:{narration:'先沿溪流看水与草地的关系，再看围栏怎样分隔相邻空间。开敞草地与林木共同构成鲁朗的谷地风景。这是二零一二年的照片；溪流名称和围栏用途没有核实，不把画面当成通行或管护规定。',marks:[['溪流',1],['围栏',2],['开敞草地',3]]},
 grazing:{narration:'林地与草地在同一山谷中相邻。放牧活动让我们看到，旅行中的风景也是生产和生活的空间。围栏与通道把不同使用空间联系起来。原作者将这张二零一四年的照片标为扎西岗，它不代表今天的放牧范围。',marks:[['林地与草地',1],['放牧活动',2],['围栏与通道',3]]},
 town:{narration:'先看河流穿过谷地。道路沿谷地延伸，支路与跨河连接把两侧空间联系起来。房屋和开敞地分布其间，地方生活就在这样的空间里展开。这是二零二四年的航拍，不是古村复原，也不能据照片确定每栋建筑的用途。',marks:[['河流',1],['道路',2],['房屋',3]]},
 daily:{narration:'临街门面与屋檐构成街道的一侧。门前活动中可以看到桌球和停留；相邻空间里，人们共同在场。它提醒我们，认识鲁朗不只有看风景，也要看地方怎样被使用。这张二零零八年的照片不代表所有居民的日常。',marks:[['临街门面',1],['门前活动',2],['相邻空间',3]]},
 customs:{narration:'这是工布地区的新闻静帧，拍摄场地没有核实为鲁朗。竞赛场景把射手和现场的人联系起来；节庆服饰呈现活动中的表达，共同参与让风俗成为集体生活的一部分。鲁朗地方报道也记有响箭与歌舞，但不能把这张地区影像当作鲁朗现场。',marks:[['竞赛场景',1],['节庆服饰',2],['共同参与',3]]},
 target:{narration:'先看箭靶，再看场地布置：竞赛需要共同使用的设施和活动空间。原始记录来自二零二二年的工布地区新闻画面，具体村落没有核实。它与前一张参与者照片不是同一次活动，也不是鲁朗场地测绘。',marks:[['箭靶',1],['场地布置',2],['原始记录',3]]},
};
export const lulangPhotoNarrationCues=Object.entries(lulangPhotoReadings).map(([id,reading])=>({id:`ROUTE-PHOTO-${id}`,title:`鲁朗实景自选讲解 · ${id}`,stepId:'G318-photo',chapterId:'route-photo',narration:reading.narration}));
export function lulangPhotoFocus(id:LulangPhotoId,textProgress:number){
 const reading=lulangPhotoReadings[id],at=Math.max(0,Math.min(1,textProgress))*reading.narration.length;
 return reading.marks.reduce((focus,[token,next])=>at>=reading.narration.indexOf(token)?next:focus,0);
}
