import {describe,expect,it} from 'vitest';
import {atlasHotspots} from '../src/data/atlas';
import {cityOverviews,cityOverviewFacets,getCityOverview} from '../src/data/cityOverview';
import {
  atlasHash,
  atlasLocationForStep,
  cityAtlasLocation,
  detailHash,
  detailOrigin,
  parseAtlasLocation,
  type AtlasLocation,
} from '../src/lib/spatialJourney';

describe('city overview navigation and topic return context',()=>{
  it('opens the default city overview and gives an unavailable city a usable entry',()=>{
    expect(cityAtlasLocation()).toEqual({...atlasLocationForStep('G4'),view:'cities',cityId:'lhasa',facet:'position'});
    expect(cityAtlasLocation('removed-city','history')).toEqual(cityAtlasLocation('lhasa','history'));
  });

  it('restores every city and facet from the URL alone after a refresh',()=>{
    for(const city of cityOverviews)for(const facet of cityOverviewFacets){
      const location=cityAtlasLocation(city.id,facet.id);
      const page=new URL(`http://127.0.0.1:5173/#${atlasHash(location)}`);
      const restored=parseAtlasLocation(page.hash);
      expect(restored,`${city.id}/${facet.id}`).toEqual(location);
      expect(parseAtlasLocation(atlasHash(restored!))).toEqual(location);
    }
  });

  it('returns to the originating city and facet when the detailed case belongs to another region',()=>{
    const topic=atlasLocationForStep('P1')!;
    const topicPlace=atlasHotspots.find(point=>point.id===topic.hotspotId)!;
    expect(topicPlace.regionId).toBe('nyingchi');
    const origin:AtlasLocation={...topic,view:'cities',cityId:'shigatse',facet:'environment'};
    const detail=detailHash('landscape','P1',origin);
    const refreshedDetail=new URL(`http://127.0.0.1:5173/#${detail}`).hash;
    expect(parseAtlasLocation(refreshedDetail)).toBeUndefined();
    expect(detailOrigin(refreshedDetail,'P1')).toEqual(origin);
    const returned=parseAtlasLocation(atlasHash(detailOrigin(refreshedDetail,'P1')!));
    expect(returned).toEqual(origin);
    expect(returned?.hotspotId).toBe(topic.hotspotId);
    expect(returned?.cityId).not.toBe(topicPlace.regionId);
  });

  it('keeps the city return context separate from the topic date, theme and question',()=>{
    const topic=atlasLocationForStep('H3')!;
    const origin:AtlasLocation={...topic,view:'cities',cityId:'ngari',facet:'history'};
    const detail=detailHash('history','H3',origin);
    expect(detailOrigin(`${detail}&journey=guided`,'H3')).toEqual(origin);
    expect(detailOrigin(detail,'K1')).toEqual(origin);
    const params=new URLSearchParams(detail.split('?')[1]);
    expect(params.get('from')).toBe(`${topic.themeId}/${topic.hotspotId}/H3`);
    expect(params.get('city')).toBe('ngari');
    expect(params.get('facet')).toBe('history');
  });

  it('normalizes missing or invalid city and facet query values to known content',()=>{
    const topic=atlasLocationForStep('K2')!;
    const regionId=atlasHotspots.find(point=>point.id===topic.hotspotId)!.regionId;
    expect(getCityOverview(regionId)).toBeDefined();
    for(const query of ['view=cities','view=cities&city=removed-city&facet=removed-facet','view=cities&city=&facet=']){
      const normalized=parseAtlasLocation(`${atlasHash(topic)}?${query}`);
      expect(normalized).toEqual({...topic,view:'cities',cityId:regionId,facet:'position'});
      expect(parseAtlasLocation(atlasHash(normalized!))).toEqual(normalized);
    }
    expect(parseAtlasLocation(`${atlasHash(topic)}?view=cities&city=chamdo&facet=removed-facet`))
      .toEqual({...topic,view:'cities',cityId:'chamdo',facet:'position'});
    expect(parseAtlasLocation(`${atlasHash(topic)}?view=cities&city=removed-city&facet=today`))
      .toEqual({...topic,view:'cities',cityId:regionId,facet:'today'});
  });

  it('does not carry city-only parameters into an explicit topic map or an unknown view',()=>{
    const topic=atlasLocationForStep('H2')!;
    const explicit:AtlasLocation={...topic,view:'topics'};
    expect(parseAtlasLocation(`${atlasHash(topic)}?view=topics&city=ngari&facet=history`)).toEqual(explicit);
    expect(atlasHash({...explicit,cityId:'ngari',facet:'history'})).toBe(`${atlasHash(topic)}?view=topics`);
    expect(detailOrigin(detailHash('history','H2',explicit),'H2')).toEqual(explicit);
    expect(parseAtlasLocation(`${atlasHash(topic)}?view=unknown&city=lhasa&facet=today`)).toEqual(topic);
    expect(parseAtlasLocation(`${atlasHash(topic)}?city=lhasa&facet=history`)).toEqual(topic);
  });

  it('keeps old topic, atlas and detail bookmarks compatible without adding city state',()=>{
    const original=atlasLocationForStep('K2')!;
    const oldAtlas=`/atlas/${original.themeId}/${original.hotspotId}/${original.questionId}`;
    const oldDetail=`/learn/culture/K2/detail?from=${original.themeId}/${original.hotspotId}/K2`;
    expect(atlasHash(original)).toBe(oldAtlas);
    expect(parseAtlasLocation(oldAtlas)).toEqual(original);
    expect(parseAtlasLocation('#/learn/culture/K2')).toEqual(original);
    expect(detailHash('culture','K2',original)).toBe(oldDetail);
    expect(detailOrigin(oldDetail,'K2')).toEqual(original);
    expect(detailOrigin('#/learn/culture/K2/detail','K2')).toEqual(original);
    expect(parseAtlasLocation('#/learn/position/G1')).toBeUndefined();
    expect(parseAtlasLocation('#/learn/position/G2')).toBeUndefined();
    expect(detailOrigin('#/learn/position/G1','G1')).toBeUndefined();
  });
});
