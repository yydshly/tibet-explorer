import type { SceneSettings } from './store';

export const plateauClimateStages = ['arrival', 'uplift', 'cloud', 'regions', 'life'] as const;
export type PlateauClimateStage = typeof plateauClimateStages[number];
export type PlateauClimateCity = 'nyingchi' | 'lhasa' | 'ngari';
export type PlateauClimateSettings = Pick<SceneSettings, 'layer' | 'progress' | 'season' | 'selected' | 'airMoisture'>;
const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const smooth = (value: number, start: number, end: number) => { const t = clamp((value - start) / (end - start)); return t * t * (3 - 2 * t); };
export const plateauClimateIndex = (layer: string) => Math.max(0, plateauClimateStages.indexOf(layer as PlateauClimateStage));

/** This spatial path is an authored transect over real terrain, not a measured
 * air trajectory, road, river or an assumed common route to all three cities. */
export function plateauParcelPosition(progress: number) {
  const t = clamp(progress);
  return { longitude: 93.7 + .95 * t + .24 * Math.sin(Math.PI * t), latitude: 25.65 + 4.35 * t };
}

/** Qualitative display response to the model's actual upward displacement.
 * No fixed lapse rate, pressure measurement or temperature is inferred. */
export function plateauAirResponse(teachingLiftMetres: number) {
  const amount = smooth(Math.max(0, teachingLiftMetres), 0, 4800);
  return { expansion: 1 + amount * .85, cooling: amount };
}

export function plateauClimateState(settings: PlateauClimateSettings) {
  const stageIndex = plateauClimateIndex(settings.layer), stage = plateauClimateStages[stageIndex], progress = clamp(settings.progress);
  const city: PlateauClimateCity = settings.selected === 'lhasa' || settings.selected === 'ngari' ? settings.selected : 'nyingchi';
  const moisture = settings.airMoisture === 'lower' ? 'lower' : 'higher';
  const season = settings.season === 3 ? 'winter' : settings.season === 1 ? 'summer' : 'transition';
  let title = '', explanation = '', phase = '', parcelProgress = .05, cloudAmount = 0, rainAmount = 0, runoffAmount = 0;
  if (stage === 'arrival') {
    phase = progress < .3 ? 'earth' : progress < .68 ? 'asia' : 'plateau';
    title = phase === 'earth' ? '同一个地球：海洋、大陆与空气相连' : phase === 'asia' ? '从印度洋与西侧大陆，看高原的外部联系' : '镜头走近：地形始终贴在地球上';
    explanation = season === 'winter' ? '冬季背景强调西侧联系；西风也可能携带水汽。路径只示意方向，不是实时风场，不能据此断言某地是否下雨。' : '南侧海洋与西侧大陆提供不同来向。夏季南侧水汽联系较突出，但来路会随高度、季节与天气改变。接下来在同一地形上追踪一次原理过程。';
    parcelProgress = .05 + progress * .18;
  } else if (stage === 'uplift') {
    phase = progress < .3 ? 'approach' : progress < .72 ? 'rise' : 'cool';
    title = phase === 'approach' ? '空气来到山地：沿真实地形认识迎风方向' : phase === 'rise' ? '地形迫使部分空气抬升，气团随高度膨胀' : '抬升与冷却：水汽够不够，决定下一步';
    explanation = '金色气团沿藏东南教学剖面移动，轨迹始终高于同一公开高程网格。变大的气团表示膨胀原理，颜色变化表示冷却关系；大小与颜色不换算真实体积或气温。山地也会使空气绕流，并非所有空气都翻越山脊。' + (moisture === 'higher' ? '蓝色标记较多：携带较多水汽；下一段再看是否达到凝结条件。' : '蓝色标记较少：只减少初始水汽，地形与抬升路径不变。');
    parcelProgress = .1 + progress * .7;
    cloudAmount = 0;
  } else if (stage === 'cloud') {
    phase = progress < .25 ? 'inflow' : progress < .4 ? 'lift' : progress < .62 ? 'condense' : progress < .86 ? 'rain' : 'ground';
    title = phase === 'inflow' ? '先追踪入流：蓝色水汽标记还不是云' : phase === 'lift' ? '同一气团沿地形抬升、膨胀与冷却' : moisture === 'lower' ? '相同地形，较少初始水汽：本对照未出现同样云雨' : phase === 'condense' ? '达到条件后凝结；云滴继续增长' : phase === 'rain' ? '降水落到这片真实山地上' : '到达地面：水才进入坡面与地方用水问题';
    explanation = phase === 'inflow' ? '在这个定性对照中，金色稀疏轮廓表示空气团边界，内部青色点表示气态水。此时尚未成云；先沿同一条教学路径看空气从低处来到山地。' : phase === 'lift' ? '气团随地形抬升进入较低气压环境，膨胀与冷却。地面金点读的是实际高程网格；气团大小与位置是原理示意，不是当地温度或气压实测。' : moisture === 'lower' ? '只改变初始水汽，保留地形和抬升路径。在这个定性对照中，较少水汽没有达到相同成云与降水条件；这不是“冬季或西部永远无雨”的判断。' : phase === 'condense' ? '在这个较多水汽的示意条件中，抬升冷却后出现凝结，白色团簇表示云滴。有云不等于已经下雨，还要经历云滴或冰晶的增长过程。' : phase === 'rain' ? '云滴增长到形成降水时，蓝色标记沿当地重力方向落到真实高程表面。蓝线表示降水过程，不给出虚构降雨量；到达地面以后才开始讨论坡面去向。' : '青色水点沿同一高程网格较低的方向移动，遇到局地低点便停止。它说明坡面去向，不是实测河道；自然水还要经过汇集、储存与取用，才可能服务生活。';
    parcelProgress = .1 + progress * .8;
    cloudAmount = moisture === 'higher' ? smooth(progress, .4, .62) : 0;
    rainAmount = moisture === 'higher' ? smooth(progress, .62, .86) : 0;
    runoffAmount = moisture === 'higher' ? smooth(progress, .86, 1) : 0;
  } else if (stage === 'regions') {
    phase = city;
    const names = { nyingchi: '林芝与藏东南', lhasa: '拉萨与南部河谷', ngari: '阿里与西部高原' };
    title = `${names[city]}：把水汽来路、海拔与地形放在一起`;
    explanation = city === 'nyingchi' ? '藏东南较易受到南侧水汽影响，复杂山地与谷地让地方差异很大。林芝城区只是定位参考，不能代表全市每个坡面。比较真实地区，需要相同统计时段和变量。' : city === 'lhasa' ? '拉萨处在高原南部河谷，既有高海拔背景，也有河谷位置与季节降水影响。它与藏东南、阿里的差别，不能只用纬度或单一雨影解释。' : '阿里位于西部高原，距主要夏季水汽来路、海拔与复杂环流共同参与较干冷的背景。西风与季风都可能影响这一带，具体作用需分季节和位置；狮泉河聚居地参考点不代表整个阿里地区。';
    parcelProgress = .9;
  } else {
    phase = city;
    title = city === 'nyingchi' ? '从林芝地区的环境，追问土地、水与通行' : city === 'lhasa' ? '从拉萨河谷的条件，走向聚居与服务' : '从阿里高原的条件，认识取水与通行约束';
    explanation = '镜头保留同一片地形与城市位置，把自然条件接到人的生活问题：可用土地在哪里，水怎样取得，人与物怎样来往。自然提供机会和约束；技术、组织、历史与人的选择共同影响生活，不能由气候直接推出文化。';
    parcelProgress = .9;
  }
  return { stage, stageIndex, progress, phase, title, explanation, city, moisture, season, parcelProgress, cloudAmount, rainAmount, runoffAmount };
}

export function plateauClimateFeedback(settings: PlateauClimateSettings) {
  const state = plateauClimateState(settings); return { title: state.title, text: state.explanation };
}

