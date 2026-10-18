import {cultureContinuityCue} from './overviewEditorial';
/** These functional readings accompany the same regional map. Neither diagram
 * is a surveyed local installation or a historical reconstruction. */
export const overviewMechanismCues=[
 cultureContinuityCue,
 {id:'OVERVIEW-water-service',title:'从有水到用水：中间发生了什么',stepId:'OVERVIEW' as const,chapterId:'overview' as const,
 narration:'刚才比较了三地的真实地形。现在保留全图，用一个功能示意看清水怎样进入使用。左边有水，右边的储水空间却还是空的。打开取水通道，水沿通道进入储水空间；源端减少，使用端增加，才能看见转移，而不只是画出一条线。关闭通道，后续补水停止，已有的水不会凭空消失。试着开关通道，比较有水源和能够持续取用的区别。这不是当地管网或流量模拟。狮泉河二〇二三年的林地灌溉与管护报道，提供了设施和持续劳动的具体例子；拉萨水利规划则是需求与建设安排，不能当成全部建成。回到三地，自然条件需要经过人的行动才进入生活。接下来问：除了供水和通行，哪些历史行动塑造了地方的用途与文化？'},
 {id:'OVERVIEW-culture-actions',title:'文化怎样延续：保存物件，也组织学习',stepId:'OVERVIEW' as const,chapterId:'overview' as const,
 narration:'历史告诉我们人和地方何时发生联系，文化还要追问这些联系怎样延续。先看一件约十二世纪初的西藏木经板，真实照片来自大都会艺术博物馆。它是一块护经板，不是正文。把功能示意展开，先辨认易损的书页，再整理叠放，最后合上两侧木板。你可以展开和合拢，观察木板怎样包护书页。空白页与另一块板只解释保护功能，不复原这件文物原来配套的经书。保存物件还不等于文化持续实践。再以藏戏为例，先有讲述、表演与观看；学习者靠近示范者，再进入共同练习，观看才接到参与机会。这里不复原具体演出，也不把走近等同于学会。联合国教科文组织二〇〇九年的列入决定提出年轻实践者培训等保护措施，列入不是起源，也不是保护已经成功。把物件保存和人的参与放回全域，再进入一个真实街区，观察历史用途怎样和今天生活共处。'},
];
export type OverviewMechanismKind='water'|'manuscript'|'practice';
export interface OverviewMechanismState {kind:OverviewMechanismKind;progress:number;connected:boolean;title:string;reason:string;}
export const overviewMechanismSources={
 water:[{title:'阿里地区：狮泉河盆地林地灌溉与管护',url:'https://www.al.gov.cn/info/1035/48267.htm',note:'2023年地方报道；示意不使用或声称当地管网、流量、家庭供水数据。'}],
 culture:[{title:'The Met · 木经板 1987.407.6',url:'https://www.metmuseum.org/art/collection/search/37610',note:'约12世纪初；馆方解释成对木板保护易损书页。示意不是该物件配套经书复原。'},{title:'UNESCO · 2009年藏戏列入决定',url:'https://ich.unesco.org/en/decisions/4.COM/13.23',note:'R.3提出年轻实践者培训等保护措施；场地和人数仅为教学安排。'}],
};
