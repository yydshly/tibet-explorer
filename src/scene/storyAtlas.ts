import {buildOverviewMechanismLens} from './overviewMechanismLens';
import * as THREE from 'three';
import {buildClimateLabOverlay} from './climateLabOverlay';
import {climateLabPlaces} from '../data/climateLab';
import {climateLabCoordinates} from '../lib/climateLabProcess';
import { atlasHotspots } from '../data/atlas';
import { regionalAnchors } from '../data/regionalStudy';
import { verifiedPlaceReferences } from '../data/placeProvenance';
import { silingCoEvidence } from '../data/climateEvidence';
import { GOLD, TEAL, label, line } from './environment';
import { sampleTerrainMetres, TERRAIN_READING_META } from './terrainReading';
import { placeAtlasLabel } from '../lib/atlasLabelLayout';
import { rasterizeGeographicMask } from './geographicMask';
import { buildCityLifeOverlay } from './cityLifeOverlay';
import { buildCityBuiltSurface } from './cityBuiltSurface';
import { buildCityContinuity } from './cityContinuity';
import { buildCityComparison, CITY_COMPARISON_IDS, CITY_COMPARISON_VERTICAL_EXAGGERATION } from './cityComparison';
import type { TibetSceneProps } from './TibetScene';
import { cityContinuityPartState } from '../lib/cityContinuityState';
import { cityAccessCityRange } from '../lib/cityAccessState';
import { buildCityLocalMap, LOCAL_MAP_VERTICAL_EXAGGERATION } from './cityLocalMap';
import { buildCityLocalLocator } from './cityLocalLocator';
import {buildClimateObservationMap} from './climateObservationMap';
import { buildTransportGeographicReferences } from './transportGeographicReferences';
import { regionalTerrainColour, sampleRegionalSurfaceMetres } from './regionalTerrainSurface';
import {buildRegionalJourneyOverlay} from './regionalJourneyOverlay';
import {buildRegionalSpatialMap,REGIONAL_SPATIAL_RELIEF} from './regionalSpatialMap';
import type {RegionalJourneyCityId} from '../data/regionalJourneyTypes';
import {overviewAtlasCamera,overviewReturnCamera} from './overviewAtlasCamera';
import {buildOverviewRiverReading} from './overviewRiverReading';
import {buildNarratedGeographyReading} from './narratedGeographyReading';

type Runtime = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  focus: (position: THREE.Vector3, target: THREE.Vector3, framing?: 'viewport'|'local-place'|'recorded') => void;
  hasSavedView: (key: string) => boolean;
};
type Theme = 'environment' | 'people' | 'history' | 'development';
type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
type GeoPoint = readonly [number, number];
type SourceLine = { object: THREE.Line; coordinates: GeoPoint[]; offset: number };
type Callout = {
  id: string; title: string; longitude: number; latitude: number; sprite: THREE.Sprite;
  compactTitle: string; compactSprite: THREE.Sprite;
  leader: THREE.Line; pin: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  halo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; themes: readonly string[];
  background?: boolean; cityId?: string;
};

/** A continuous regional map, not an isolated terrain sample or route survey. */
export const STORY_ATLAS_META = {
  west: 68, east: 115, south: 14, north: 45, width: 36,
  verticalExaggeration: 16,
  image: '/assets/earth-blue-marble.jpg',
  boundaries: '/assets/earth-context.json',
  elevation: TERRAIN_READING_META.dataUrl,
  elevationCoverage: TERRAIN_READING_META,
  sourceNote: '海陆底图 NASA · 概览边界 Natural Earth · 框内 Mapzen 高程 ×16',
} as const;

const { west, east, south, north, width: WIDTH } = STORY_ATLAS_META;
const METRES_PER_UNIT = (east - west) * 111320 * Math.cos(THREE.MathUtils.degToRad((south + north) / 2)) / WIDTH;
const DEPTH = (north - south) * 111320 / METRES_PER_UNIT;
const height = (metres: number) => metres / METRES_PER_UNIT * STORY_ATLAS_META.verticalExaggeration;
export function storyAtlasPosition(longitude: number, latitude: number, elevation = 0) {
  return new THREE.Vector3((longitude - (west + east) / 2) / (east - west) * WIDTH, elevation,
    ((north + south) / 2 - latitude) / (north - south) * DEPTH);
}
export function storyAtlasHasElevation(longitude: number, latitude: number) {
  const b = TERRAIN_READING_META;
  return longitude >= b.west && longitude <= b.east && latitude >= b.south && latitude <= b.north;
}
export function storyAtlasTheme(layer: string): Theme {
  const id = layer.replace(/^atlas-/, '');
  return ['environment', 'people', 'history', 'development'].includes(id) ? id as Theme : 'environment';
}
/** Travel starts by observing the very same terrain/water mechanism previously
 * understood, before turning to historical use and access on this map. */
export function storyAtlasTravelProcess(_p: Pick<TibetSceneProps,'layer'|'step'|'progress'|'cityLifeServices'|'selected'>){
  // Travel now reads acquired local river/road geography. Resetting to the
  // regional locator must not resurrect unlocated wells or irrigation gates.
  return undefined;
}

/** Keep the actual source footprint explicit; never extrapolate its elevations. */
export function buildStoryAtlasScene(runtime: Runtime,options:{localDetails?:boolean;overviewMesh?:boolean;regionalCityId?:RegionalJourneyCityId;requireElevation?:boolean;macroOverviewLocal?:boolean;irrigationView?:boolean;groundView?:boolean}={}) {
  const group = new THREE.Group();
  group.userData.kind = 'continuous-story-atlas';
  const sourceAbort = new AbortController();
  let alive = true, dem: Int16Array | null = null, demFailed = false, boundaryFailed = false;
  let settleRegional:()=>void=()=>{};const regionalReady=new Promise<void>(resolve=>{settleRegional=resolve;});
  let displayedRelief = 1;
  let lastApproach='';
  let lastCityViewport='';
  let lastCityReset: number | undefined;
  let lastTopicViewport='';
  let lastTopicReset:number|undefined;
  let lastOverviewCamera='';
  let lastLabCamera='';
  const sourceLines: SourceLine[] = [];
  const themeColors: Record<Theme, number> = { environment: TEAL, people: 0xf0d2a0, history: GOLD, development: 0x9de3bd };
  const elevationAt = (longitude: number, latitude: number) => dem && storyAtlasHasElevation(longitude, latitude)
    ? Math.max(.025, height(sampleTerrainMetres(dem, longitude, latitude)) * displayedRelief) : .025;
  const at = (longitude: number, latitude: number, offset = .055) => storyAtlasPosition(longitude, latitude, elevationAt(longitude, latitude) + offset);
  let mechanismLens:ReturnType<typeof buildOverviewMechanismLens>|undefined;
  const riverReading=buildOverviewRiverReading(runtime.camera,at);group.add(riverReading.group);
  const geographyReading=buildNarratedGeographyReading(runtime.camera,at);group.add(geographyReading.group);
  const cityLife = buildCityLifeOverlay({ camera: runtime.camera, at,
    baseline: (longitude, latitude) => storyAtlasPosition(longitude, latitude, 0),
    metres: (longitude, latitude) => dem && storyAtlasHasElevation(longitude, latitude)
      ? sampleTerrainMetres(dem, longitude, latitude) : undefined,
  });
  group.add(cityLife.group);
  const regionalJourney=buildRegionalJourneyOverlay({camera:runtime.camera,at,
    baseline:(longitude,latitude)=>storyAtlasPosition(longitude,latitude,0),
    metres:(longitude,latitude)=>dem&&storyAtlasHasElevation(longitude,latitude)?sampleTerrainMetres(dem,longitude,latitude):undefined,
    metresToWorld:metres=>height(metres)*displayedRelief,
  });group.add(regionalJourney.group);
  const cityComparison = buildCityComparison({ camera: runtime.camera, at,
    baseline: (longitude, latitude) => storyAtlasPosition(longitude, latitude, 0),
    metres: (longitude, latitude) => dem && storyAtlasHasElevation(longitude, latitude)
      ? sampleTerrainMetres(dem, longitude, latitude) : undefined,
    metresToWorld: metres => height(metres) * Math.max(1, displayedRelief),
  });
  group.add(cityComparison.group);
  const climateLab=buildClimateLabOverlay({at,metres:(lon,lat)=>dem&&storyAtlasHasElevation(lon,lat)?sampleTerrainMetres(dem,lon,lat):undefined});group.add(climateLab.group);
  const climateObservations=buildClimateObservationMap({camera:runtime.camera,at});group.add(climateObservations.group);
  const cityBuiltSurface=buildCityBuiltSurface(at,{enabled:options.localDetails!==false&&!options.macroOverviewLocal});
  group.add(cityBuiltSurface.group);
  const cityContinuity=buildCityContinuity({camera:runtime.camera,at,
    metres:(longitude,latitude)=>dem&&storyAtlasHasElevation(longitude,latitude)?sampleTerrainMetres(dem,longitude,latitude):undefined,
  });
  group.add(cityContinuity.group);
  const localMap=buildCityLocalMap({maxAnisotropy:runtime.renderer.capabilities.getMaxAnisotropy(),camera:runtime.camera,project:storyAtlasPosition,metresPerUnit:METRES_PER_UNIT,regionalReady,regionalMetres:(longitude,latitude)=>dem?sampleRegionalSurfaceMetres(dem,longitude,latitude):undefined,focus:runtime.focus},{enabled:options.localDetails!==false,localityId:options.irrigationView?'shiquanhe':options.macroOverviewLocal?'lhasa':undefined,groundView:options.groundView});group.add(localMap.group);
  const regionalSpatial=buildRegionalSpatialMap({camera:runtime.camera,project:storyAtlasPosition,metresPerUnit:METRES_PER_UNIT,regionalReady,regionalMetres:(longitude,latitude)=>dem?sampleRegionalSurfaceMetres(dem,longitude,latitude):undefined,focus:runtime.focus},options.regionalCityId);group.add(regionalSpatial.group);
  const localLocator=buildCityLocalLocator(at);group.add(localLocator.group);
  const transportReferences=buildTransportGeographicReferences({camera:runtime.camera,at},{enabled:options.localDetails!==false});group.add(transportReferences.group);
  let wasLocal=false,wasRegional=false;

  const setMapUV = (geometry: THREE.BufferGeometry) => {
    const vertices = geometry.attributes.position as THREE.BufferAttribute;
    const uvs = geometry.attributes.uv as THREE.BufferAttribute;
    for (let index = 0; index < vertices.count; index++) {
      const longitude = (vertices.getX(index) / WIDTH) * (east - west) + (west + east) / 2;
      const latitude = (north + south) / 2 - (vertices.getZ(index) / DEPTH) * (north - south);
      uvs.setXY(index, (longitude + 180) / 360, (latitude + 90) / 180);
    }
    uvs.needsUpdate = true;
  };
  // Continue the same georeferenced NASA raster beyond the study window. A
  // regional elevation sample sits in its world context, never on a floating
  // rectangular tile. No extra elevation is created outside the source grid.
  const baseGeometry = new THREE.PlaneGeometry(WIDTH * 360 / (east - west), DEPTH * 170 / (north - south));
  baseGeometry.rotateX(-Math.PI / 2);
  const worldCenter=storyAtlasPosition(0,0);baseGeometry.translate(worldCenter.x,0,worldCenter.z);setMapUV(baseGeometry);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x5e7d77, roughness: 1,depthWrite:false });
  // Background imagery fills unsampled geography first. It must never compete
  // with the metre-height DEM for depth at a regional corridor camera scale.
  const base = new THREE.Mesh(baseGeometry, baseMaterial);base.renderOrder=-10; base.receiveShadow = false; group.add(base);

  // Local/corridor cameras retain every archived regional sample. The home
  // overview keeps its lighter mesh and does not load unrelated local detail.
  const coarseMesh=options.overviewMesh??options.localDetails===false;
  const b = TERRAIN_READING_META, columns = coarseMesh?193:b.columns, rows = coarseMesh?113:b.rows;
  const demGeometry = new THREE.PlaneGeometry((b.east - b.west) / (east - west) * WIDTH,
    (b.north - b.south) / (north - south) * DEPTH, columns - 1, rows - 1);
  demGeometry.rotateX(-Math.PI / 2);
  const demCenter = storyAtlasPosition((b.west + b.east) / 2, (b.south + b.north) / 2);
  demGeometry.translate(demCenter.x, 0, demCenter.z); setMapUV(demGeometry);
  const demMaterial = new THREE.MeshStandardMaterial({ color: 0xdbe1cf, roughness: .96, side: THREE.DoubleSide });
  const regionalColours=new Float32Array(columns*rows*3),terrainColourScratch=new THREE.Color();let terrainColoursReady=false;demGeometry.setAttribute('atlasTerrainColour',new THREE.BufferAttribute(regionalColours,3));
  const terrain = new THREE.Mesh(demGeometry, demMaterial); terrain.visible = false; terrain.receiveShadow = false;
  terrain.userData={kind:'sourced-dem',columns,rows,source:TERRAIN_READING_META.dataUrl,localDisplayScope:'区域源格网连续背景；地方窗口边缘仅做两份真实高程数据的LOD衔接'}; group.add(terrain);
  // Emphasize the sourced administrative region without flattening or replacing
  // surrounding geography. Both surfaces sample the same lon/lat membership.
  // The texture is shader-owned and explicitly disposed below, outside map slots.
  let regionMask:THREE.DataTexture|undefined;
  const maskUniforms={
    atlasRegionMask:{value:null as THREE.DataTexture|null},
    atlasRegionBounds:{value:new THREE.Vector4(0,0,1,1)},
    atlasOutsideStrength:{value:0},
    atlasLocalWindow:{value:new THREE.Vector4()},
    atlasLocalActive:{value:0},
    atlasLocalTint:{value:1},
  };
  for(const material of [baseMaterial,demMaterial]){
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,maskUniforms);
      if(material===demMaterial){
        shader.vertexShader=`attribute vec3 atlasTerrainColour;\nvarying vec3 atlasHeightTint;\nvarying vec2 atlasSourceXZ;\n${shader.vertexShader}`;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','atlasHeightTint=atlasTerrainColour;\natlasSourceXZ=(modelMatrix*vec4(transformed,1.0)).xz;\n#include <project_vertex>');
        shader.fragmentShader=`varying vec3 atlasHeightTint;\nvarying vec2 atlasSourceXZ;\nuniform vec4 atlasLocalWindow;\nuniform float atlasLocalActive;\nuniform float atlasLocalTint;\n${shader.fragmentShader}`;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          if(atlasLocalActive>0.5&&atlasSourceXZ.x>=atlasLocalWindow.x&&atlasSourceXZ.x<=atlasLocalWindow.z&&atlasSourceXZ.y>=atlasLocalWindow.y&&atlasSourceXZ.y<=atlasLocalWindow.w) discard;`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,atlasHeightTint,atlasLocalActive*atlasLocalTint);');
      }
      shader.fragmentShader=`uniform sampler2D atlasRegionMask;\nuniform vec4 atlasRegionBounds;\nuniform float atlasOutsideStrength;\n${shader.fragmentShader}`;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        #ifdef USE_MAP
          vec2 atlasMaskUv=(vMapUv-atlasRegionBounds.xy)/atlasRegionBounds.zw;
          float atlasInBounds=step(0.0,atlasMaskUv.x)*step(atlasMaskUv.x,1.0)*step(0.0,atlasMaskUv.y)*step(atlasMaskUv.y,1.0);
          float atlasInside=texture2D(atlasRegionMask,atlasMaskUv).r*atlasInBounds;
          float atlasLuminance=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
          vec3 atlasOutside=mix(vec3(atlasLuminance),diffuseColor.rgb,0.08)*0.38;
          diffuseColor.rgb=mix(diffuseColor.rgb,atlasOutside,atlasOutsideStrength*(1.0-atlasInside));
        #endif`);
    };
    material.customProgramCacheKey=()=> 'story-atlas-source-region-local-window-v4';
  }
  // The sea/land map continues beyond the elevation window. There are no box
  // walls or invented terrain outside the shipped metre grid.
  const imageReady=new Promise<void>(resolve=>{new THREE.TextureLoader().load(STORY_ATLAS_META.image, texture => {
    if (!alive) { texture.dispose(); resolve();return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, runtime.renderer.capabilities.getMaxAnisotropy());
    baseMaterial.map = demMaterial.map = texture; baseMaterial.color.set(0xc3d1c8); demMaterial.color.set(0xe4e5d2);
    baseMaterial.needsUpdate = demMaterial.needsUpdate = true;
    resolve();
  },undefined,()=>resolve());});

  const addSourceLine = (coordinates: GeoPoint[], color: number, opacity: number, dashed = false, offset = .07) => {
    const object = line(coordinates.map(([lon, lat]) => at(lon, lat, offset)), color, opacity, dashed);
    object.userData.kind = 'geographic-reference'; group.add(object); sourceLines.push({ object, coordinates, offset }); return object;
  };
  const extent: GeoPoint[] = [];
  for (let i = 0; i < 50; i++) extent.push([THREE.MathUtils.lerp(b.west, b.east, i / 50), b.north]);
  for (let i = 0; i < 26; i++) extent.push([b.east, THREE.MathUtils.lerp(b.north, b.south, i / 26)]);
  for (let i = 0; i < 50; i++) extent.push([THREE.MathUtils.lerp(b.east, b.west, i / 50), b.south]);
  for (let i = 0; i <= 26; i++) extent.push([b.west, THREE.MathUtils.lerp(b.south, b.north, i / 26)]);
  const footprint = addSourceLine(extent, 0xb0c8be, .34, true, .045); footprint.userData.kind = 'dem-coverage';

  // Interpolate outlines before draping, and split at the viewport bounds.
  // A clipped line remains a clipped line, never a false closing border.
  const addBoundary = (geometry: Geometry, color: number, opacity: number, dashed: boolean, kind: string) => {
    const parent = new THREE.Group(); parent.userData.kind = kind; group.add(parent);
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
    for (const polygon of polygons) for (const ring of polygon) {
      let segment: GeoPoint[] = [];
      const flush = () => {
        if (segment.length > 1) { const object = addSourceLine(segment, color, opacity, dashed, .095); parent.add(object); }
        segment = [];
      };
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i], c = ring[i + 1], count = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / .15));
        for (let j = 0; j < count; j++) {
          const lon = THREE.MathUtils.lerp(a[0], c[0], j / count), lat = THREE.MathUtils.lerp(a[1], c[1], j / count);
          if (lon >= west && lon <= east && lat >= south && lat <= north) segment.push([lon, lat]); else flush();
        }
      }
      const end = ring[ring.length - 1]; if (end && end[0] >= west && end[0] <= east && end[1] >= south && end[1] <= north) segment.push([end[0], end[1]]);
      flush();
    }
    return parent;
  };
  let plateauBoundary: THREE.Group | undefined;
  const boundariesReady=fetch(STORY_ATLAS_META.boundaries, { signal: sourceAbort.signal }).then(response => {
    if (!alive) throw new Error('Atlas disposed');
    if (!response.ok) throw new Error('Atlas outlines unavailable'); return response.json() as Promise<{ china?: Geometry; tibet?: Geometry; plateau?: Geometry }>;
  }).then(data => {
    if (!alive) return;
    if (data.china) addBoundary(data.china, 0xb8d3d3, .55, false, 'china-boundary');
    if (data.tibet) {
      addBoundary(data.tibet, 0xf4f5eb, .96, false, 'tibet-boundary');
      const mask=rasterizeGeographicMask(data.tibet),[maskWest,maskSouth,maskEast,maskNorth]=mask.bounds;
      regionMask=new THREE.DataTexture(mask.data,mask.width,mask.height,THREE.RedFormat);
      regionMask.name='Natural Earth Xizang administrative membership';
      regionMask.colorSpace=THREE.NoColorSpace;
      regionMask.minFilter=regionMask.magFilter=THREE.LinearFilter;
      regionMask.generateMipmaps=false;regionMask.flipY=false;regionMask.needsUpdate=true;
      maskUniforms.atlasRegionMask.value=regionMask;
      maskUniforms.atlasRegionBounds.value.set((maskWest+180)/360,(maskSouth+90)/180,(maskEast-maskWest)/360,(maskNorth-maskSouth)/180);
    }
    if (data.plateau) plateauBoundary = addBoundary(data.plateau, TEAL, .5, true, 'physical-plateau-reference');
  }).catch(() => { if (alive) boundaryFailed = true; });
  const refreshDisplayedTerrain = () => {
    if (!dem) return;
    const vertices = demGeometry.attributes.position as THREE.BufferAttribute;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const longitude = THREE.MathUtils.lerp(b.west, b.east, col / (columns - 1));
      const latitude = THREE.MathUtils.lerp(b.north, b.south, row / (rows - 1));
      const metres=sampleTerrainMetres(dem,longitude,latitude);
      vertices.setY(row * columns + col, Math.max(.025,height(metres)*displayedRelief));
      // Height colour belongs to the immutable source grid, not to the chosen
      // vertical exaggeration. Only Y/normals change when relief is adjusted.
      if(!terrainColoursReady)regionalTerrainColour(metres,terrainColourScratch).toArray(regionalColours,(row*columns+col)*3);
    }
    vertices.needsUpdate = true;if(!terrainColoursReady){demGeometry.attributes.atlasTerrainColour.needsUpdate=true;terrainColoursReady=true;} demGeometry.computeVertexNormals(); demGeometry.computeBoundingSphere(); terrain.visible = true;
    for (const item of sourceLines) {
      const positions = item.object.geometry.attributes.position as THREE.BufferAttribute;
      item.coordinates.forEach(([lon, lat], index) => positions.setY(index, elevationAt(lon, lat) + item.offset));
      positions.needsUpdate = true; item.object.computeLineDistances(); item.object.geometry.computeBoundingSphere();
    }
    terrain.userData.displayedRelief = displayedRelief;
  };
  const elevationReady=fetch(STORY_ATLAS_META.elevation, { signal: sourceAbort.signal }).then(response => {
    if (!alive) throw new Error('Atlas disposed');
    if (!response.ok) throw new Error('Atlas elevation unavailable'); return response.arrayBuffer();
  }).then(buffer => {
    if (!alive) return;
    if (buffer.byteLength !== b.columns * b.rows * 2) throw new Error('Atlas elevation size mismatch');
    const bytes = new DataView(buffer); dem = new Int16Array(b.columns * b.rows);
    for (let index = 0; index < dem.length; index++) dem[index] = bytes.getInt16(index * 2, true);
    refreshDisplayedTerrain();
  }).catch(() => { if (alive) demFailed = true; }).finally(settleRegional);

  const grid = new THREE.Group(); group.add(grid);
  for (const latitude of [20, 30, 40]) grid.add(line([storyAtlasPosition(west, latitude, .02), storyAtlasPosition(east, latitude, .02)], 0xe5e7d4, .13));
  for (const longitude of [70, 80, 90, 100, 110]) grid.add(line([storyAtlasPosition(longitude, south, .02), storyAtlasPosition(longitude, north, .02)], 0xe5e7d4, .13));

  const callouts: Callout[] = [];
  const addCallout = (id: string, title: string, longitude: number, latitude: number, themes: readonly string[], background = false, compactTitle = title) => {
    const sprite = label(title, background ? '#d8e4d6' : '#f3eedb',3,'map'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 23;
    sprite.userData.screenAnnotation = true;
    const compactSprite = label(compactTitle, '#e6efde',3,'map'); compactSprite.onBeforeRender = () => {}; compactSprite.renderOrder = 23;
    compactSprite.userData.screenAnnotation = true;
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), new THREE.MeshBasicMaterial({ color: background ? 0xbad4d0 : GOLD, depthTest: false }));
    pin.renderOrder = 20;
    const halo = new THREE.Mesh(new THREE.RingGeometry(.15, .19, 36), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .95, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.renderOrder = 19;
    const leader = line([at(longitude, latitude), at(longitude, latitude)], 0xddd7b5, .7); (leader.material as THREE.LineBasicMaterial).depthTest = false; leader.renderOrder = 21;
    if (id) for (const object of [sprite, compactSprite, pin, halo, leader]) object.userData.selectId = `atlas:${id}`;
    pin.userData.kind = background ? 'city-reference' : 'atlas-hotspot';
    const callout: Callout={ id, title, compactTitle, longitude, latitude, themes, sprite, compactSprite, pin, halo, leader, background };
    group.add(sprite, compactSprite, pin, halo, leader); callouts.push(callout);
    return callout;
  };
  for (const hotspot of atlasHotspots) {
    const theme = hotspot.themes[0], index = atlasHotspots.filter(point => point.themes.includes(theme)).findIndex(point => point.id === hotspot.id) + 1;
    const item=addCallout(hotspot.id, hotspot.mapLabel, hotspot.longitude, hotspot.latitude, hotspot.themes, false,
      `${String(index).padStart(2, '0')} ${hotspot.mapLabel}`);
    item.pin.userData.reference={longitude:hotspot.longitude,latitude:hotspot.latitude,
      name:hotspot.locatorName,sourceId:hotspot.coordinateSourceId,sourceUrl:hotspot.coordinateSourceUrl};
  }
  // C9 locates the centre of a published study-area envelope. It is not a lake
  // shoreline, measured lake centre or geometry input for the area comparison.
  const study=silingCoEvidence.locationReference;
  const studyCallout=addCallout('siling-co-study','色林错研究区 · 范围中心参照',study.longitude,study.latitude,[]);
  studyCallout.pin.userData.reference={longitude:study.longitude,latitude:study.latitude,
    name:study.label,sourceId:study.sourceId,derivation:study.derivation,limitation:study.limitation};
  // Seven cities remain spatial references across themes; a theme material at
  // that city supplies its selectable introduction instead of a second title.
  for (const city of regionalAnchors) {
    const reference=verifiedPlaceReferences[city.id];
    const nearby = atlasHotspots.find(point => Math.hypot(point.longitude - city.longitude, point.latitude - city.latitude) < .65)
      ?? atlasHotspots.find(point => point.regionId === city.id);
    const compactTitle=city.title.replace(/\s*·\s*城区参照$/, '').replace(/参照$/, '');
    const item=addCallout(nearby?.id ?? '', city.title, reference.longitude, reference.latitude, [], true, compactTitle);
    item.cityId=city.id;
    for(const object of [item.sprite,item.compactSprite,item.pin,item.halo,item.leader])object.userData.cityId=city.id;
    item.pin.userData.reference={longitude:reference.longitude,latitude:reference.latitude,name:reference.name,
      sourceId:reference.sourceId,sourceUrl:reference.sourceUrl,scope:reference.scope};
  }

  const contextLabels = [
    { title: '中国 · 西南方位', longitude: 108, latitude: 35, color: '#cadbd5' },
    { title: '西藏自治区', longitude: 84.8, latitude: 34, color: '#f7d99b' },
    { title: '印度次大陆', longitude: 78, latitude: 21, color: '#c6d5cc' },
    { title: '孟加拉湾', longitude: 90, latitude: 18, color: '#a9dce1' },
    { title: '青藏高原', longitude: 94, latitude: 39.1, color: '#9be1db' },
  ].map(item => { const sprite = label(item.title, item.color,3,'map'); sprite.onBeforeRender = () => {}; sprite.renderOrder = 16; group.add(sprite); return { ...item, sprite }; });
  const source = label('NASA 底图 · Natural Earth 边界', '#c2d4cb'); source.onBeforeRender = () => {}; group.add(source);
  const sourceDetail = label('虚线框内高程 ×16 · 框外只示海陆', '#a9c9c4'); sourceDetail.onBeforeRender = () => {}; group.add(sourceDetail);
  const northLabel = label('北', '#e4dfc9'); northLabel.onBeforeRender = () => {}; group.add(northLabel);
  const northArrow = line(Array.from({ length: 5 }, () => new THREE.Vector3()), 0xe4dfc9, .95);
  (northArrow.material as THREE.LineBasicMaterial).depthTest = false; northArrow.renderOrder = 25; group.add(northArrow);
  const extentLabel = label('高程覆盖框', '#bfd1c7'); extentLabel.onBeforeRender = () => {}; group.add(extentLabel);
  const loading = label('高程正在加载，海陆位置可先观察', '#d4ded0'); loading.onBeforeRender = () => {}; group.add(loading);
  const failed = label('高程未加载 · 当前仅显示海陆底图', '#e6c0a0'); failed.onBeforeRender = () => {}; failed.visible = false; group.add(failed);

  const viewport = new THREE.Vector2(), projected = new THREE.Vector3(), anchor = new THREE.Vector3(), worldA = new THREE.Vector3(), worldB = new THREE.Vector3();
  const screenSprite = (sprite: THREE.Sprite, x: number, y: number, width: number, spriteHeight: number, depth = .5) => {
    worldA.set(x / viewport.x * 2 - 1, 1 - y / viewport.y * 2, depth).unproject(runtime.camera);
    worldB.set((x + width) / viewport.x * 2 - 1, 1 - (y + spriteHeight) / viewport.y * 2, depth).unproject(runtime.camera);
    sprite.position.copy(worldA); sprite.scale.set(Math.abs(worldB.x - worldA.x), Math.abs(worldB.y - worldA.y), 1);
    // View-space distances, unlike world x/y differences, work after rotation.
    const distance = worldA.distanceTo(runtime.camera.position), focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
    sprite.scale.set(width * distance / focal, spriteHeight * distance / focal, 1); sprite.updateMatrixWorld();
  };
  const focusCities = (home=false,overlay=true,lifeCity?:string,comparison=false,regionalClose=false) => {
    // Frame the seven sourced locality references together. Padding is a camera
    // allowance, not an administrative outline or a claimed urban extent.
    const region=regionalClose&&lifeCity?verifiedPlaceReferences[lifeCity]:undefined;
    const points=region?[at(region.longitude-1.7,region.latitude-1.9,.18),at(region.longitude+1.7,region.latitude+1.6,.18)]:home?[at(78,27,.18),at(100,37,.18)]:regionalAnchors.map(city=>at(city.longitude,city.latitude,.18));
    const bounds=new THREE.Box3().setFromPoints(points);bounds.min.x-=.8;bounds.max.x+=.8;bounds.min.z-=.7;bounds.max.z+=.7;
    bounds.min.y=0;bounds.max.y=Math.max(1.3,bounds.max.y);
    const centre=bounds.getCenter(new THREE.Vector3()),direction=comparison?new THREE.Vector3(0,.82,1).normalize():new THREE.Vector3(0,1,.7).normalize();
    const chosen=lifeCity?verifiedPlaceReferences[lifeCity]:undefined;
    // A modest regional emphasis still fits all seven genuine locality points.
    // Playing a process never replaces the map with a single-city model.
    if(chosen&&!region)centre.lerp(at(chosen.longitude,chosen.latitude,.18),.08);
    const up=new THREE.Vector3(0,direction.z,-direction.y),right=new THREE.Vector3(1,0,0);
    // City/home panels overlay the canvas; the topic reader is already outside
    // its canvas. Subtracting that sidebar twice makes the regional map tiny.
    const insetLeft=overlay&&viewport.x>900?338:0;
    const top=home?(viewport.x>900?70:210):overlay?112:80;
    const bottom=Math.max(top+80,viewport.y-(home?(viewport.x>900?225:90):overlay?120:85)),middle=(top+bottom)/2;
    const tanV=Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov/2));
    const halfWidth=Math.max(55,(viewport.x-insetLeft-100)/2),halfHeight=Math.max(35,(bottom-top)/2);
    const tanSafeX=tanV*(viewport.x/viewport.y)*(halfWidth/(viewport.x/2));
    const tanSafeY=tanV*(halfHeight/(viewport.y/2));
    let distance=region?8:overlay?16:10;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const relative=new THREE.Vector3(x,y,z).sub(centre),depth=relative.dot(direction);
      distance=Math.max(distance,Math.abs(relative.dot(right))/tanSafeX+depth,Math.abs(relative.dot(up))/tanSafeY+depth);
    }
    distance*=lifeCity?1.07:1.12;
    // Put the geographic centre in the usable map area below the source key.
    const target=centre.clone().addScaledVector(up,-(1-middle/viewport.y*2)*distance*tanV).addScaledVector(right,-insetLeft/viewport.x*distance*tanV*(viewport.x/viewport.y));
    // The fit above already accounts for the usable viewport, including its
    // aspect ratio. The owner must not replace it with a fixed atlas distance
    // or apply a second portrait-aspect expansion.
    runtime.focus(target.clone().addScaledVector(direction,distance),target,'viewport');
  };
  return {
    group,
    ready:Promise.all([imageReady,boundariesReady,elevationReady,localMap.ready,transportReferences.ready,regionalSpatial.ready]).then(()=>{
      // Ordinary atlas readers can retain their explicit flat-map fallback.
      // The continuous overview teaches from this terrain, so a missing or
      // malformed source must not release its synchronized narration clock.
      if(alive&&options.requireElevation&&demFailed)throw new Error('Atlas elevation required for the continuous overview');
    }),
    renderOverlay(world:THREE.Scene){localLocator.render(runtime.renderer,world,[localMap.group,cityLife.group,regionalJourney.group,cityComparison.group,climateObservations.group,cityBuiltSurface.group,cityContinuity.group,transportReferences.group]);climateLab.render(runtime.renderer,world);mechanismLens?.render(runtime.renderer);},
    dispose() { if(!alive)return;alive = false;sourceAbort.abort();mechanismLens?.dispose();climateLab.dispose();cityLife.dispose();regionalJourney.dispose();regionalSpatial.dispose();cityComparison.dispose();climateObservations.dispose();cityBuiltSurface.dispose();cityContinuity.dispose();localMap.dispose();localLocator.dispose();transportReferences.dispose();regionMask?.dispose();regionMask=undefined;maskUniforms.atlasRegionMask.value=null; },
    update(p: TibetSceneProps) {
      const home=p.layer==='atlas-home',overview=p.layer==='atlas-overview',regional=p.layer==='atlas-regional-journey',life=p.layer==='atlas-city-life',comparison=p.layer==='atlas-city-comparison',cities=p.layer==='atlas-cities'||home||life||comparison||regional||overview;
      const recordedAtlas=overview&&!p.climateLab&&p.overviewPresentation&&p.overviewShot?.cameraMode==='atlas';
      const observingClimate=(comparison&&p.step===0||p.climateLab?.stage==='evidence')&&p.climateObservationMonth!==undefined;
      climateObservations.group.visible=false;
      // The human-history overview keeps one display scale through whole-map
      // and local readings; a historical date never changes ground geometry.
      const nextRelief=p.groundJourney?1/STORY_ATLAS_META.verticalExaggeration:p.overviewLocalContext?LOCAL_MAP_VERTICAL_EXAGGERATION/STORY_ATLAS_META.verticalExaggeration:comparison?(p.comparisonRelief===false?0:CITY_COMPARISON_VERTICAL_EXAGGERATION/STORY_ATLAS_META.verticalExaggeration):1;
      if(!localMap.active()&&!regionalSpatial.active()&&nextRelief!==displayedRelief){displayedRelief=nextRelief;refreshDisplayedTerrain();}
      maskUniforms.atlasOutsideStrength.value=regionMask?(cities?1:.4):0;
      (footprint.material as THREE.LineDashedMaterial).opacity=cities?.14:.34;
      const theme = storyAtlasTheme(overview?(p.overviewTopic==='history'||p.overviewTopic==='culture'?'atlas-history':p.overviewTopic==='connections'?'atlas-development':'atlas-environment'):p.layer), selected = p.selected.replace(overview?/^(?:city:|point:|atlas:)/:cities?/^city:/:/^atlas:/, '');
      runtime.renderer.getSize(viewport); if (viewport.x < 1 || viewport.y < 1) return;
      if(p.overviewMechanism&&!mechanismLens)mechanismLens=buildOverviewMechanismLens();
      mechanismLens?.update(p.overviewMechanism);
      riverReading.update(p.overviewRiver,viewport);
      geographyReading.update(p.narratedGeography,viewport);
      const cityViewport=`${p.layer}:${life||regional?selected:''}:${regional&&p.regionalCloseView?'near':'whole'}:${Math.round(viewport.x)}:${Math.round(viewport.y)}`;
      if(cities&&(lastCityViewport!==cityViewport||lastCityReset!==p.resetKey)){
        if(!recordedAtlas)focusCities(home,!p.overviewPresentation,life||regional?selected:undefined,comparison,regional&&p.regionalCloseView);lastCityViewport=cityViewport;lastCityReset=p.resetKey;
      }else if(!cities){lastCityViewport='';lastCityReset=undefined;}
      const topicViewport=`${Math.round(viewport.x)}:${Math.round(viewport.y)}`;
      if(!cities&&(lastTopicViewport!==topicViewport||lastTopicReset!==p.resetKey)){
        focusCities(false,false);lastTopicViewport=topicViewport;lastTopicReset=p.resetKey;
      }else if(cities){lastTopicViewport='';lastTopicReset=undefined;}
      if(!cities&&p.viewKey==='atlas-arrival'&&p.progress>=.18&&lastApproach!==selected){const point=atlasHotspots.find(item=>item.id===selected);if(point){lastApproach=selected;const target=at(point.longitude,point.latitude,.2);runtime.focus(target.clone().add(new THREE.Vector3(0,15,13)),target);}}
      regionalSpatial.update(p,viewport);const actualRegion=regionalSpatial.active();
      if(actualRegion){
        wasRegional=true;
        const relief=REGIONAL_SPATIAL_RELIEF/STORY_ATLAS_META.verticalExaggeration;if(displayedRelief!==relief){displayedRelief=relief;refreshDisplayedTerrain();}
        maskUniforms.atlasOutsideStrength.value=0;maskUniforms.atlasLocalActive.value=1;maskUniforms.atlasLocalWindow.value.set(actualRegion.bounds.min.x,actualRegion.bounds.min.z,actualRegion.bounds.max.x,actualRegion.bounds.max.z);
        for(const item of callouts)for(const object of [item.pin,item.halo,item.sprite,item.compactSprite,item.leader])object.visible=false;
        for(const item of contextLabels)item.sprite.visible=false;
        for(const object of [source,sourceDetail,northLabel,northArrow,extentLabel,loading,failed,cityLife.group,regionalJourney.group,cityComparison.group,cityBuiltSurface.group,cityContinuity.group,transportReferences.group])object.visible=false;
        if(plateauBoundary)plateauBoundary.visible=false;runtime.sun.position.set(-9,19,12);runtime.sun.intensity=1.4;return;
      }
      localMap.update(p,viewport);const local=localMap.active();
      // Real imagery observation keeps the geographic image outside its fine
      // window. The neutral height tint belongs only to schematic local views.
      maskUniforms.atlasLocalTint.value=p.groundJourney?0:1;
      if(local){
        // Local detail is a window in the real regional surface. A global
        // low-resolution colour raster must not become an empty brown backdrop
        // when the camera follows a 50–120 km sourced road corridor.
        maskUniforms.atlasOutsideStrength.value=0;
        const localRelief=(p.groundJourney?1:LOCAL_MAP_VERTICAL_EXAGGERATION)/STORY_ATLAS_META.verticalExaggeration;if(displayedRelief!==localRelief){displayedRelief=localRelief;refreshDisplayedTerrain();}
        if((p.overviewReturnMix!==undefined||p.groundJourney)&&p.overviewShot){
          const sourcePose=localMap.group.userData.cameraFrame as {position?:THREE.Vector3;target?:THREE.Vector3}|undefined;
          if(sourcePose?.position&&sourcePose.target){
            const whole=overviewAtlasCamera({camera:runtime.camera,viewport:{width:viewport.x,height:viewport.y},wholePoints:regionalAnchors.map(city=>at(city.longitude,city.latitude,.18)),resolve:()=>undefined,shot:p.overviewShot});
            const pose=overviewReturnCamera({position:sourcePose.position,target:sourcePose.target},whole,p.groundJourney?.returnMix??p.overviewReturnMix!);
            const key=`return:${JSON.stringify(p.groundJourney)??p.overviewReturnMix}:${viewport.x}:${viewport.y}:${p.resetKey}`;
            if(lastOverviewCamera!==key){lastOverviewCamera=key;runtime.focus(pose.position,pose.target,'recorded');}
          }
        }
        maskUniforms.atlasLocalActive.value=1;maskUniforms.atlasLocalWindow.value.set(local.bounds.min.x,local.bounds.min.z,local.bounds.max.x,local.bounds.max.z);
        localLocator.update(local.id,localMap.group.userData.cameraFrame?.geographicBounds??local.data.metadata.bbox,viewport,p.overviewPresentation,Boolean(p.groundJourney));wasLocal=true;
        for(const item of callouts)for(const object of [item.pin,item.halo,item.sprite,item.compactSprite,item.leader])object.visible=false;
        for(const item of contextLabels)item.sprite.visible=false;
        for(const object of [source,sourceDetail,northLabel,northArrow,extentLabel,loading,failed,cityLife.group,regionalJourney.group,cityComparison.group,cityBuiltSurface.group,cityContinuity.group,transportReferences.group])object.visible=false;
        // Keep geographic orientation during the same-map approach/return.
        // Reuse sourced regional labels; do not leave a bare relief between
        // the local imagery window and the following regional chapter.
        if(p.groundJourney&&p.groundJourney.returnMix>.35){
          for(const item of callouts.filter(item=>['lhasa','nyingchi','ngari'].includes(item.cityId??''))){
            anchor.copy(at(item.longitude,item.latitude,.18));projected.copy(anchor).project(runtime.camera);
            const x=(projected.x+1)*viewport.x/2,y=(1-projected.y)*viewport.y/2;
            if(projected.z<-1||projected.z>1||x<70||x>viewport.x-70||y<220||y>viewport.y-150)continue;
            const image=item.compactSprite.material.map?.image as {width?:number;height?:number}|undefined;
            const labelWidth=22*(image?.width??240)/(image?.height??96);
            item.compactSprite.visible=true;screenSprite(item.compactSprite,x,y,labelWidth,22,projected.z);
          }
        }
        if(local.routeInfo?.legIds||local.routeInfo?.id==='gunsa-airport-shiquanhe'||local.routeInfo?.id==='nyingchi-lulang-g318'){
          const occupied=local.labels.children.flatMap(object=>object.visible&&object.userData.screenBox?[object.userData.screenBox as {x:number;y:number;width:number;height:number}]:[]);
          const insetWidth=viewport.x<520?136:viewport.y<450?162:194,insetTop=viewport.y<450?94:166;
          occupied.push({x:viewport.x-60-insetWidth/2,y:insetTop+insetWidth*.57/2,width:insetWidth+10,height:insetWidth*.57+45});
          transportReferences.update(p,viewport,occupied);
        }
        if(plateauBoundary)plateauBoundary.visible=false;runtime.sun.position.set(-9,19,12);runtime.sun.intensity=1.1;group.userData.locality=local.id;return;
      }
      maskUniforms.atlasLocalActive.value=0;localLocator.update(undefined,undefined,viewport);group.userData.locality=undefined;
      if(nextRelief!==displayedRelief){displayedRelief=nextRelief;refreshDisplayedTerrain();}
      if(wasLocal||wasRegional){wasLocal=false;wasRegional=false;if(!recordedAtlas)focusCities(home,!p.overviewPresentation,life||regional?selected:undefined,comparison,regional&&p.regionalCloseView);}
      if(recordedAtlas&&p.overviewShot){
        const shot=p.overviewShot,key=JSON.stringify([shot.cameraFrom,shot.cameraTo,shot.cameraMix,p.overviewEvidenceWidth??0,viewport.x,viewport.y,p.resetKey]);
        if(key!==lastOverviewCamera){
          lastOverviewCamera=key;
          const resolve=(id:string)=>{const city=verifiedPlaceReferences[id],point=atlasHotspots.find(item=>item.id===id);return city?at(city.longitude,city.latitude,.18):point?at(point.longitude,point.latitude,.18):undefined;};
          const pose=overviewAtlasCamera({camera:runtime.camera,viewport:{width:viewport.x,height:viewport.y},wholePoints:regionalAnchors.map(city=>at(city.longitude,city.latitude,.18)),resolve,shot,evidenceWidth:p.overviewEvidenceWidth});
          runtime.focus(pose.position,pose.target,'recorded');
        }
      }else lastOverviewCamera='';
      if(comparison)runtime.sun.position.set(-12,13,7);else runtime.sun.position.set(-9,19,12);
      runtime.sun.intensity = comparison?2.2:2.1;
      if (plateauBoundary) plateauBoundary.visible = !cities&&theme === 'environment';
      const themeColor = themeColors[theme];
      const mobile = viewport.x < 600, labelHeight = mobile ? 22 : 25;
      const minY = home?70:95, maxY = Math.max(minY, viewport.y - (home?210:120));
      const sourceX = viewport.x / 2 + 20, sourceWidth = Math.min(viewport.x - 90, 337);
      const labPoint=p.climateLab&&p.climateLab.stage!=='evidence'?climateLabCoordinates(p.climateLab,p.climateLab.progress):undefined;
      const labLife=p.climateLab?.stage==='life';
      const labProjected=labPoint?at(labPoint.longitude,labPoint.latitude,labLife?.39:1.9).add(new THREE.Vector3(labLife?-2:0,0,0)).project(runtime.camera):undefined;
      const occupied: { x: number; y: number; width: number; height: number }[] = [
        ...(labProjected?[{x:(labProjected.x+1)*viewport.x/2,y:(1-labProjected.y)*viewport.y/2,width:labLife?200:155,height:labLife?38:80}]:[]),
        ...(overview&&(p.overviewEvidenceWidth??0)>1?[{x:(p.overviewEvidenceWidth??0)/2,y:viewport.y/2,width:p.overviewEvidenceWidth??0,height:viewport.y}]:[]),
        ...cityLife.occupied(p,viewport),
        ...regionalJourney.occupied(p,viewport),
        ...cityComparison.occupied(p,viewport),
        ...cityContinuity.occupied(p,viewport),
        ...(cities&&!p.overviewPresentation&&viewport.x>900?[{x:164,y:viewport.y/2,width:310,height:viewport.y}]:[]),
        { x: viewport.x - 31, y: 126, width: 54, height: 126 },
        { x: 33, y: minY + 35, width: 55, height: 80 },
        ...(!cities?[{ x: sourceX, y: minY + 10, width: sourceWidth, height: 16 },{ x: sourceX, y: minY + 30, width: sourceWidth, height: 16 }]:[]),
      ];
      // Country, administrative region and the surrounding sea/land retain
      // priority. The map must establish the whole before naming local topics.
      const showContextLabels=()=>{for (const item of contextLabels) {
        anchor.copy(at(item.longitude, item.latitude, .1)); projected.copy(anchor).project(runtime.camera);
        const x = (projected.x + 1) * viewport.x / 2, y = (1 - projected.y) * viewport.y / 2;
        const width = item.title.length * (mobile ? 10 : 11) + 22;
        item.sprite.visible = projected.z > -1 && projected.z < 1 && x > width / 2 + 8 && x < viewport.x - width / 2 - 8 && y > minY && y < maxY &&
          !occupied.some(box => Math.abs(x - box.x) < (width + box.width) / 2 + 6 && Math.abs(y - box.y) < (22 + box.height) / 2 + 5);
        if (item.sprite.visible) { screenSprite(item.sprite, x, y, width, mobile ? 21 : 23, projected.z); occupied.push({ x, y, width, height: 23 }); }
      }};
      // In the city overview the seven locality names take first priority;
      // national and regional context labels use the remaining clear space.
      if(!cities)showContextLabels();else contextLabels.forEach(item=>{item.sprite.visible=false;});
      let secondaryLabelsShown = 0;
      const compactCityPriority=['ngari','nagqu','shigatse','chamdo','nyingchi','shannan','lhasa'];
      const ordered = [...callouts].sort((a, c) => Number(overview?(c.cityId===selected||c.id===selected):(cities?c.cityId:c.id) === selected) - Number(overview?(a.cityId===selected||a.id===selected):(cities?a.cityId:a.id) === selected) ||
        (cities&&mobile&&a.cityId&&c.cityId?compactCityPriority.indexOf(a.cityId)-compactCityPriority.indexOf(c.cityId):Number(a.background)-Number(c.background)));
      for (const item of ordered) {
        const geographicCity=Boolean(p.narratedGeography?.cities.some(id=>id===item.cityId));
        const active = item.themes.includes(theme), chosen = overview?(item.cityId===selected||item.id===selected||Boolean(p.narratedGeography?.cities.some(id=>id===item.cityId))):cities?item.cityId===selected:!item.background && item.id === selected;
        const city=Boolean(item.cityId);
        const compared=comparison&&CITY_COMPARISON_IDS.some(id=>id===item.cityId);
        if(city)for(const object of [item.sprite,item.compactSprite,item.pin,item.halo,item.leader]){
          object.userData.selectId=cities?`city:${item.cityId}`:`atlas:${item.id}`;
        }
        item.pin.visible = cities?city||(overview&&chosen):item.background || active || chosen;
        item.halo.visible = cities?city||(overview&&chosen):chosen;
        item.sprite.visible = item.compactSprite.visible = item.leader.visible = false;
        if (!item.pin.visible) continue;
        anchor.copy(at(item.longitude, item.latitude, .18)); item.pin.position.copy(anchor); item.halo.position.copy(anchor).add(new THREE.Vector3(0, .015, 0));
        projected.copy(anchor).project(runtime.camera);
        const ax = (projected.x + 1) * viewport.x / 2, ay = (1 - projected.y) * viewport.y / 2;
        const focal = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)));
        item.pin.scale.setScalar((chosen ? 5 : cities?4.2:item.background ? 2.4 : 3.6) * anchor.distanceTo(runtime.camera.position) / focal / .1);
        item.halo.scale.setScalar((geographicCity?.85:chosen?1.65:cities?1.1:1.65) * item.pin.scale.x);
        item.halo.material.color.set(cities&&!chosen?TEAL:GOLD);
        item.halo.material.opacity=chosen?.95:compared?.8:comparison?.15:.38;
        item.pin.material.color.set(chosen ? GOLD : compared?0xb2e1ca:comparison?0x778f83:cities?TEAL:item.background ? 0xc7d8cf : themeColor);
        const projectedInView=projected.z>=-1&&projected.z<=1&&ax>=0&&ax<=viewport.x&&ay>=minY-25&&ay<=viewport.y-150;
        if (!projectedInView&&!(cities&&chosen)) continue;
        const materialAtCity = item.background && callouts.some(other => !other.background && other.themes.includes(theme) && Math.hypot(other.longitude - item.longitude, other.latitude - item.latitude) < .65);
        if(comparison&&!compared)continue;
        // Preserve all seven selectable points; small screens name the selected
        // locality and at most three spread-out context cities to avoid a dense
        // cluster of names around the southern river valleys.
        if(cities&&(mobile||life)&&!chosen&&secondaryLabelsShown>=3)continue;
        if (!cities&&(item.background || materialAtCity || (!chosen && secondaryLabelsShown >= (mobile ? 2 : 3)))) continue;
        const text = chosen&&!comparison&&!geographicCity ? item.title : item.compactTitle, sprite = chosen&&!comparison&&!geographicCity ? item.sprite : item.compactSprite;
        const textUnits = Array.from(text).reduce((total, character) => total + (character.charCodeAt(0) < 128 ? .55 : 1), 0);
        const width = Math.min(viewport.x - 24, textUnits * (mobile ? 11.5 : 12) + 25);
        let best = placeAtlasLabel({ anchorX: ax, anchorY: ay, width, height: labelHeight, viewportWidth: viewport.x, minY, maxY, occupied, selected: chosen });
        if(!best&&cities&&chosen){
          // A selected name remains readable after manual orbit/pan, even when
          // its point has left the viewport. The point itself never moves.
          const x=THREE.MathUtils.clamp(ax,width/2+12,viewport.x-width/2-12);
          const candidates=Array.from({length:Math.max(1,Math.floor((maxY-minY)/(labelHeight+8)))},(_,index)=>minY+index*(labelHeight+8));
          const clear=candidates.filter(y=>!occupied.some(box=>Math.abs(x-box.x)<(width+box.width)/2+6&&Math.abs(y-box.y)<(labelHeight+box.height)/2+5));
          best={x,y:clear.sort((a,b)=>Math.abs(a-ay)-Math.abs(b-ay))[0]??Math.max(minY,Math.min(maxY,ay))};
        }
        if (!best) continue;
        if (!chosen) secondaryLabelsShown++;
        occupied.push({ ...best, width, height: labelHeight });
        sprite.visible = item.leader.visible = true;
        screenSprite(sprite, best.x, best.y, width, labelHeight, projected.z>=-1&&projected.z<=1?projected.z:.5);
        if(cities&&chosen&&!projectedInView)item.leader.visible=false;
        const positions = item.leader.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, anchor.x, anchor.y, anchor.z); positions.setXYZ(1, sprite.position.x, sprite.position.y, sprite.position.z);
        positions.needsUpdate = true; item.leader.geometry.computeBoundingSphere();
      }
      if(cities)showContextLabels();
      source.visible = sourceDetail.visible = false;
      screenSprite(source, sourceX, minY + 10, sourceWidth, 16);
      screenSprite(sourceDetail, sourceX, minY + 30, Math.min(sourceWidth, 325), 16);
      if (boundaryFailed) source.visible = false;
      // A fixed upward arrow becomes wrong after orbiting the map. Project the
      // map's actual north direction and keep only its compass position fixed.
      const origin = storyAtlasPosition(90, 30, 2).project(runtime.camera), north = storyAtlasPosition(90, 32, 2).project(runtime.camera);
      const direction = new THREE.Vector2((north.x - origin.x) * viewport.x, -(north.y - origin.y) * viewport.y).normalize();
      if (direction.lengthSq() < .01) direction.set(0, -1);
      const compass = new THREE.Vector2(cities?viewport.x-45:33, minY + 35), tip = compass.clone().addScaledVector(direction, 18);
      const right = new THREE.Vector2(-direction.y, direction.x);
      const compassPoints = [compass, tip, tip.clone().addScaledVector(direction, -6).addScaledVector(right, 4), tip,
        tip.clone().addScaledVector(direction, -6).addScaledVector(right, -4)];
      const arrowPositions = northArrow.geometry.attributes.position as THREE.BufferAttribute;
      compassPoints.forEach((point, index) => {
        const vertex = new THREE.Vector3(point.x / viewport.x * 2 - 1, 1 - point.y / viewport.y * 2, .5).unproject(runtime.camera);
        arrowPositions.setXYZ(index, vertex.x, vertex.y, vertex.z);
      });
      arrowPositions.needsUpdate = true; northArrow.geometry.computeBoundingSphere();
      screenSprite(northLabel, tip.x + direction.x * 11, tip.y + direction.y * 11, 18, 21);
      const extentAnchor = at(b.east, b.north, .1); projected.copy(extentAnchor).project(runtime.camera);
      const ex = (projected.x + 1) * viewport.x / 2, ey = (1 - projected.y) * viewport.y / 2;
      extentLabel.visible = !cities && ex > 60 && ex < viewport.x - 60 && ey > minY + 25 && ey < maxY - 25 &&
        !occupied.some(box => Math.abs(ex - box.x) < (95 + box.width) / 2 + 6 && Math.abs(ey - 16 - box.y) < 25);
      if (extentLabel.visible) screenSprite(extentLabel, ex, ey - 16, 95, 20, projected.z);
      loading.visible = !dem && !demFailed; failed.visible = demFailed;
      if (loading.visible) screenSprite(loading, viewport.x / 2, minY + 24, Math.min(viewport.x - 25, 315), 22);
      if (failed.visible) screenSprite(failed, viewport.x / 2, minY + 24, Math.min(viewport.x - 25, 315), 22);
      climateLab.update(p.climateLab,p.onClimateLabReading);
      if(p.climateLab){
        const lab=p.climateLab,labKey=JSON.stringify([lab.stage,lab.city,lab.zoom,viewport.x,viewport.y,p.resetKey]);
        if(lastLabCamera!==labKey){
          lastLabCamera=labKey;
          const whole=overviewAtlasCamera({camera:runtime.camera,viewport:{width:viewport.x,height:viewport.y},safeRect:{left:24,right:viewport.x-24,top:65,bottom:viewport.y-105},wholePoints:[...regionalAnchors.map(city=>at(city.longitude,city.latitude,.18)),...(lab.stage==='air'?[at(91.1,26.1,1.6),at(91.1,29.9,1.6)]:[])],resolve:()=>undefined,shot:{cameraFrom:{focusIds:[],amount:0},cameraTo:{focusIds:[],amount:0},cameraMix:0}});
          if(lab.zoom&&lab.stage==='life'){
            const place=climateLabPlaces[lab.city],target=at(place.longitude,place.latitude,.1);
            runtime.focus(target.clone().add(new THREE.Vector3(0,5.3,4.6)),target,'local-place');
          }else runtime.focus(whole.position,whole.target,'local-place');
        }
      }else lastLabCamera='';
      cityLife.update(p,viewport);
      regionalJourney.update(p,viewport);
      if(regional&&p.step>=2)regionalJourney.group.visible=false;
      if(!observingClimate)cityComparison.update(storyAtlasTravelProcess(p)??p,viewport);
      climateObservations.update(observingClimate?p.climateObservationMonth:undefined,viewport,p.climateObservationStationId,Boolean(p.climateLab));
      if(observingClimate){
        cityComparison.group.visible=false;
        for(const item of callouts)if(item.cityId&&CITY_COMPARISON_IDS.includes(item.cityId as typeof CITY_COMPARISON_IDS[number]))for(const object of [item.sprite,item.compactSprite,item.leader])object.visible=false;
      }
      cityBuiltSurface.update(p);
      cityContinuity.update(p,viewport);
      transportReferences.update(p,viewport);
    },
  };
}






