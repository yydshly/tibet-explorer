export type SeasonContext = 'summer' | 'winter' | 'transition';

export function circulationSeason(season: number): SeasonContext {
  return season === 1 ? 'summer' : season === 3 ? 'winter' : 'transition';
}

export function circulationPhase(progress: number) {
  return progress < .28 ? 'heating' : progress < .62 ? 'pressure' : 'deflection';
}

export function circulationContextState(season: number, layer: string, progress: number) {
  const background = circulationSeason(season);
  const prefix = background === 'summer' ? '夏季背景' : background === 'winter' ? '冬季背景' : '春秋过渡背景';
  if (layer === 'water') return {
    title: `${prefix}：空气可以携带水汽`,
    explanation: background === 'winter'
      ? '青色标记表示气态水随空气移动；西侧系统也可以输送水汽。冬季不等于所有地区干燥，来向、湿度与降水必须按地区和高度查资料。'
      : background === 'summer'
        ? '夏季的南侧联系把印度洋与藏东南放在同一个空间背景里。青色标记是水汽输送示意，沿路径移动不意味着沿途必然下雨。'
        : '过渡季的天气系统与来向正在变化。两条路径帮助比较可能的联系；它们没有给出某一天或整个西藏的确定风场。',
  };
  if (layer === 'wind') return {
    title: `${prefix}：先看空气从哪里来`,
    explanation: background === 'winter'
      ? '西侧来向在冬季背景中突出显示；南侧只保留地理联系参考。气流会因高度、山系和天气系统而改变，箭头不表示实测风速或统一的地面风。'
      : background === 'summer'
        ? '同时比较西侧与南侧来向：它们连接不同的外部环境。高原能改变空气的运动和抬升条件，空气来向不能直接换算为水汽多少。'
        : '春秋是季节转换背景，来向不能由一个日期标签确定。两条细线保留外部联系的位置，移动标记只用于比较方向。',
  };
  const phase = circulationPhase(progress);
  return {
    title: phase === 'heating' ? '海陆受热不同，建立温度背景' : phase === 'pressure' ? '空气运动与气压差相联系' : '地球自转使运动发生偏转',
    explanation: phase === 'heating'
      ? background === 'winter'
        ? '在这个简化冬季案例中，大陆冷却较快，海洋变化较缓。先比较受热与冷却，不把颜色当作实际温度，也不把高原当作海平面气压图。'
        : background === 'summer'
          ? '在这个简化夏季案例中，大陆受热较快，海洋变化较缓。这是理解季节背景的一部分；海拔、云和地表性质也会改变局地受热。'
          : '春秋处于背景转换中。海陆变化速度不同，但实际温度和风向还取决于当时的天气，画面只展示共同原理。'
      : phase === 'pressure'
        ? '虚线表示简化的气压差方向，金色标记表示空气运动。温度差、空气柱结构和天气系统共同影响气压；两者不是把暖色直接翻译成低压。'
        : '在北半球，自转使运动相对于前进方向向右偏。弯曲路径是在同一原理案例中比较偏转；真实环流还受摩擦、山系与季节影响。',
  };
}

