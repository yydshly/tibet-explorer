/** Dated observations, not a reconstruction of historical geometry. */
export const overviewPlaceActions={id:'OVERVIEW-place-actions',title:'保护怎样改变活动与公共空间',stepId:'OVERVIEW' as const,chapterId:'overview' as const,
 narration:'从西藏全域回到拉萨河谷，再走近大昭寺与周围街区。历史不仅留下建筑，也不断改变活动的安排。先看大昭寺的供灯活动。二〇〇五年世界遗产监测报告记录，多数供灯已经从传统木构建筑移到寺前的半地下供灯室。画面先用灯光符号指出建筑与供灯的关系。现在分开供灯与木构：建筑上的大部分灯光退去，寺前出现独立的供灯示意。活动仍然延续，安排活动的空间却改变了；这解释防火措施的思路，不代表测出了火灾风险。我们没有取得供灯室测绘，寺前符号只说明相对关系，不是入口、地下轮廓或实际搬移路线。再沿同一座城市转向布达拉宫广场。二〇〇五年报告还记录，广场扩展涉及一百四十二户住户和九家机构搬迁，并提供公众休憩空间。让使用活动进入广场：观察现状开放地面中行走与停留怎样并存。空间改变带来公共使用，也牵涉原有居住和机构；不能只把它讲成一块变大的空地。这里没有画搬迁前后的住宅位置，也不把示意人数当成客流。最后退回河谷，再回到全域。保护、公共使用与生活需要共同安排。带着这些已有用途，下一段再看新的桥梁和交通怎样接入城市。',
 sources:[{title:'UNESCO / ICOMOS · 2005年监测报告，第3页（vii–viii）',url:'https://whc.unesco.org/document/5816',note:'2005年监测所见和报告状态，不将报告日期当作各工程开工或竣工日期。多数供灯迁移、消防通道、广场公共使用与搬迁分别有记录。'},{title:'现状地物几何 · 拉萨归档',url:'/data/local-places/lhasa.geojson',note:'大昭寺、寺前广场、布达拉宫与现状广场；非2005年测绘。灯光和活动标记为关系示意，非原供灯位置、真实客流或搬迁路线。'}]};
export type PlaceActionPhase='context'|'lamps'|'separate'|'square'|'public'|'return';
export interface PlaceActionState {phase:PlaceActionPhase;progress:number;separation:number;activity:number;caseId?:'jokhang'}

/** One documented change replaces the generic mainline practice window. */
export const jokhangProtectionCue={id:'OVERVIEW-jokhang-protection',title:'延续：供灯继续，活动空间怎样改变',stepId:'OVERVIEW' as const,chapterId:'overview' as const,
 narration:'回到拉萨，靠近大昭寺。场所怎样在保护中继续使用？二〇〇五年监测报告记录，多数供灯已从木构建筑移到寺前半地下供灯室。先看原有关系：供灯与木构在一起。现在分开供灯与木构，寺前供灯亮起。供灯继续，活动空间改变，让火源与木构分开。你可以来回对照：保留了什么，改变了什么？灯光是关系示意，寺前符号不是供灯室测绘，二〇〇五年也不是竣工日期。最后退回全域，再看新交通怎样接入已有生活。'};
