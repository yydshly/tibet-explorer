/** Display samples, not surveyed summits, channels or building sites. */
export const regionalTerrainMeta={west:76,east:101,south:25,north:38,columns:449,rows:257,verticalExaggeration:40,gridSpacingKm:'约 5–6 km',elevationUnit:'m',dataUrl:'/assets/terrain/tibet-regional-dem.int16',sourceUrl:'/assets/terrain/tibet-regional-dem.source.json',attribution:'Mapzen · 高程数据：USGS SRTM / GMTED、NOAA ETOPO1'} as const;
export const terrainReferencePoints=[
 {id:'terrain-himalaya',title:'喜马拉雅山系',longitude:86.8,latitude:28.2,caption:'南侧山系连接印度次大陆与高原边缘。先比较山地两侧高程，再讨论它怎样参与水汽抬升与阻挡。'},
 {id:'terrain-interior',title:'高原内部',longitude:88.2,latitude:33.7,caption:'高原内部整体海拔较高，但有山系、盆地和湖泊之间的起伏。高原不等于一块平整台面。'},
 {id:'terrain-yarlung',title:'雅鲁藏布江谷地',longitude:91.75,latitude:29.27,caption:'南部河谷嵌在山系之间。此处标示河谷方位；高程概览不能提供精确河道、流量或可通行路线。'},
 {id:'terrain-southeast',title:'藏东南山地',longitude:95.4,latitude:29.4,caption:'藏东南的山地与深切谷地交错。地形起伏是理解当地水汽联系和环境差异的空间背景。'},
] as const;
