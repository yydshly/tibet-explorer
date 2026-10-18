/** Authored button entries into the unchanged original MiniMax recordings.
 * Seconds are native source-word starts, not equal recording fractions or
 * semantic scene anchors. Real sidecar tests bind all twelve entries. */
export const cityPlaceRecordingEntries={
 'nyingchi-event':{cueId:'CONT-history-nyingchi-3',token:'鲁朗先辨认',seconds:.04102564102564102,duration:17.676},
 'nyingchi-space':{cueId:'CONT-connections-nyingchi-3',token:'米林机场',seconds:1.0666666666666664,duration:18.792},
 'nyingchi-life':{cueId:'CONT-history-nyingchi-3',token:'二〇一七年',seconds:5.087179487179487,duration:17.676},
 'nyingchi-observe':{cueId:'CONT-travel-nyingchi-2',token:'观察留在鲁朗',seconds:.04102564102564102,duration:17.604},
 'lhasa-event':{cueId:'CONT-history-lhasa-1',token:'先在拉萨',seconds:.04102564102564102,duration:14.292},
 'lhasa-space':{cueId:'ACCESS-lhasa-transfer',token:'客运接续',seconds:.04102564102564102,duration:23.328},
 'lhasa-life':{cueId:'ACCESS-lhasa-transfer',token:'洛桑赤列',seconds:11.089234257805686,duration:23.328},
 'lhasa-observe':{cueId:'CONT-travel-lhasa-2',token:'再把拉萨',seconds:.04102564102564102,duration:15.84},
 'ngari-event':{cueId:'CONT-history-ngari-3',token:'再从托林回到狮泉河',seconds:.04102564102564102,duration:16.379},
 'ngari-space':{cueId:'CONT-connections-ngari-2',token:'昆莎落地后',seconds:.04102564102564102,duration:18.432},
 'ngari-life':{cueId:'CONT-connections-ngari-3',token:'公共空间与管护',seconds:11.569230769230769,duration:18.756},
 'ngari-observe':{cueId:'CONT-travel-ngari-2',token:'观察先留在狮泉河',seconds:.04102564102564102,duration:18.756},
} as const;

export function cityPlaceRecordingEntryFraction(id:keyof typeof cityPlaceRecordingEntries){
 const entry=cityPlaceRecordingEntries[id];
 // The 1 ms offset is inside the recorded word, not a fabricated word time.
 return (entry.seconds+.001)/entry.duration;
}
