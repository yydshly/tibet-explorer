import {describe,expect,it} from 'vitest';
import {cityContinuityLessons,cityContinuityLessonSources} from '../src/data/cityContinuityLessons';
import {cityContinuitySources} from '../src/data/cityContinuity';
import {cityLifeSources} from '../src/data/cityLifeJourney';
import {cityAccessSources} from '../src/data/cityAccessChange';
import {verifiedPlaceReferences} from '../src/data/placeProvenance';

const stages=['history','connections','travel'] as const;
const cities=['nyingchi','lhasa','ngari'] as const;
const names={nyingchi:'林芝',lhasa:'拉萨',ngari:'阿里'};

describe('历史、联系和观察的二十七个可释读环节',()=>{
  it('每城每段使用三条独立正文与实际旁白，标题、年月和地区可单独理解',()=>{
    const parts=stages.flatMap(stage=>cities.flatMap(city=>cityContinuityLessons[stage][city]));
    expect(parts).toHaveLength(27);
    expect(new Set(parts.map(part=>part.id)).size).toBe(27);
    for(const stage of stages)for(const city of cities){
      const group=cityContinuityLessons[stage][city];
      expect(group).toHaveLength(3);
      group.forEach((part,index)=>{
        expect(part.id).toBe(`CONT-${stage}-${city}-${index+1}`);
        expect(part.title.trim()).not.toBe('');
        expect(part.year?.trim()).not.toBe('');
        expect(part.text.length).toBeGreaterThan(45);
        const han=part.narration.match(/\p{Script=Han}/gu)??[];
        expect(han.length).toBeGreaterThanOrEqual(45);
        expect(han.length).toBeLessThanOrEqual(90);
        // A close view names its actual sourced locality, rather than forcing
        // the administrative-region name into every recorded paragraph.
        const locality=verifiedPlaceReferences[part.referenceId]?.name.replace(/(聚居地)?参考$/,'').replace(/(镇|市)$/,'');
        expect(part.narration.includes(names[city])||Boolean(locality&&part.narration.includes(locality)),part.id).toBe(true);
      });
    }
  });

  it('每个叙述有已注册证据且只使用已归档聚居地，不补造遗址和设施坐标',()=>{
    const sources=new Map([...cityContinuitySources,...cityLifeSources,...cityAccessSources,...cityContinuityLessonSources].map(source=>[source.id,source]));
    for(const stage of stages)for(const city of cities)for(const part of cityContinuityLessons[stage][city]){
      expect(part.sourceIds.length).toBeGreaterThan(0);
      expect(new Set(part.sourceIds).size).toBe(part.sourceIds.length);
      for(const id of part.sourceIds){
        expect(sources.has(id),`${part.id}: ${id}`).toBe(true);
        expect(new URL(sources.get(id)!.url).protocol).toBe('https:');
      }
      expect(verifiedPlaceReferences[part.referenceId]?.kind).toBe('settlement-reference');
      expect(part).not.toHaveProperty('lat');
      expect(part).not.toHaveProperty('lon');
      expect(part).not.toHaveProperty('route');
    }
  });

  it('林芝保护与课堂和鲁朗服务各有事件来源、用途和独立地区参照',()=>{
    const history=cityContinuityLessons.history.nyingchi;
    expect(history[0].text).toMatch(/2006.*巴宜、米林、工布江达/);
    expect(history[0].narration).toContain('不是节日从此诞生');
    expect(history[1].text).toMatch(/2026年6月13日.*服饰.*剪纸/);
    expect(history[2].referenceId).toBe('lulang');
    expect(history[2].text).toMatch(/2016年10月1日.*试营业.*2015设计记录.*酒店、商业街/);
    expect(history[2].text).toMatch(/2017年度工作记录.*商户进驻、家庭旅馆培训.*道路.*住宿、接待和经营管护/);
    expect(history[2].text).toContain('今天的轮廓不等于2016建成测绘');
    expect(history[2].sourceIds).toContain('city-spatial-lulang-design-2015');
    const connection=cityContinuityLessons.connections.nyingchi;
    expect(connection[1].text).toContain('林芝城区参考不是村址');
    expect(connection[2].referenceId).toBe('lulang');
    expect(cityContinuityLessons.travel.nyingchi[1]).toMatchObject({referenceId:'lulang'});
    expect(cityContinuityLessons.travel.nyingchi[1].text).toMatch(/继续留在鲁朗.*2016试运营与2017.*当前服务用地/);
    expect(cityContinuityLessons.travel.nyingchi[1].text).toContain('另一地点的文化传习材料');
  });

  it('拉萨以年代和用途解释城市，再将访问管理接到观察，不拿同期模型代替史实',()=>{
    const history=cityContinuityLessons.history.lhasa;
    expect(history[0].text).toMatch(/7世纪.*宗教用途/);
    expect(history[1].text).toMatch(/五世达赖喇嘛.*1645—1648.*礼仪.*居住/);
    expect(history[2].text).toMatch(/桑结嘉措.*1690—1694.*灵塔/);
    const connection=cityContinuityLessons.connections.lhasa;
    expect(connection[1].text).toMatch(/2007年4月柳梧大桥.*客运站区与市区/);
    expect(connection[1].text).toMatch(/拉萨西货场.*另一处材料.*不在客站复原货场作业/);
    expect(connection[1].sourceIds).toEqual(expect.arrayContaining(['access-liuwu-bridge-2019','access-lhasa-west-logistics-2026']));
    expect(connection[2].text).toMatch(/2025.*第7条.*朝圣/);
    expect(cityContinuityLessons.travel.lhasa[1].text).toContain('知识顺序不等于已验证的一日安排');
    expect(cityContinuityLessons.travel.lhasa[2].text).toContain('委员会决定不能代替出行日的规则');
  });

  it('阿里将托林交流与狮泉河河岸生活分开定位，不据工程日期反推此前无使用',()=>{
    const history=cityContinuityLessons.history.ngari;
    expect(history.map(part=>part.referenceId)).toEqual(['tholing','tholing','ngari']);
    expect(history[0].text).toMatch(/1042.*加德满都.*托林/);
    expect(history[1].text).toContain('不声称它是托林出土或现藏文物');
    expect(history[2].text).toMatch(/从札达托林回到狮泉河.*2021年.*2017年.*竣工.*绿化.*休闲/);
    expect(history[2].text).toContain('不说明此前河岸不可使用');
    expect(history[2].sourceIds).toContain('city-spatial-shiquanhe-banks-2017');
    const connections=cityContinuityLessons.connections.ngari,travel=cityContinuityLessons.travel.ngari;
    expect(connections.map(part=>part.referenceId)).toEqual(['ngari','ngari','ngari']);
    expect(connections[1].text).toMatch(/G219狮泉河至昆莎.*2004年.*柏油路.*2010年通航/);
    expect(connections[1].text).toContain('不能当作2004年竣工线或出行日接驳保证');
    expect(connections[2].text).toMatch(/狮泉河同一片河流.*2017一河两岸.*公共生活/);
    expect(connections[2].text).toContain('不能把公共空间变化单独归于机场');
    expect(travel.map(part=>part.referenceId)).toEqual(['ngari','ngari','ngari']);
    expect(travel[1].text).toMatch(/继续留在狮泉河.*不能据现状公园边界倒画工程范围/);
    expect(travel[1].text).toContain('托林教师与翻译材料保留在独立的历史入口');
    expect(travel[2].text).toMatch(/2004公路、2010航空与2017河岸公共空间.*狮泉河观察问题/);
    expect(travel[2].text).toMatch(/托林和札布让另作可选跨县研读.*2006年.*早于2010通航/);
  });
});
