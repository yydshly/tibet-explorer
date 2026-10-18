/** Only locally authored three-place comparison entries can be saved as return links. */
export function cityTravelOrigin(value:unknown):string|undefined {
 if(typeof value!=='string')return undefined;
 const hash=value.replace(/^#/,'');
 const [path,query,...extra]=hash.split('?');
 if(path!=='/atlas/environment/himalaya-relief/G4'||!query||extra.length)return undefined;
 const params=new URLSearchParams(query);
 const city=params.get('city');
 if(params.size!==4||params.get('view')!=='cities'||!['nyingchi','lhasa','ngari'].includes(city||'')||params.get('facet')!=='environment'||params.get('compare')!=='1')return undefined;
 if([...params.keys()].some(key=>!['view','city','facet','compare'].includes(key)))return undefined;
 return `${path}?view=cities&city=${city}&facet=environment&compare=1`;
}

export function cityTravelOriginFor(cityId:'nyingchi'|'lhasa'|'ngari'):string {
 return `/atlas/environment/himalaya-relief/G4?view=cities&city=${cityId}&facet=environment&compare=1`;
}
