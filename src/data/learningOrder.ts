/** The public journey follows environment → people/culture → history → today.
 * Chapter storage order remains stable so existing saved identifiers keep working.
 */
export const learningStepIds: string[] = [
  'G1', 'G2', 'G3', 'G4',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
  'E1', 'E2', 'E3', 'P1', 'P2', 'P3',
  'K1', 'K2', 'K3', 'K4',
  'H1', 'H2', 'H3', 'H4',
  'R1', 'R2', 'R3', 'M1', 'M2', 'M3', 'T1', 'T2', 'T3',
];

export const learningChapterIds=['position','climate','regions','landscapes','culture','history','connections','modern','travel'];
export const learningChapterNumber=(id:string)=>learningChapterIds.indexOf(id)+1;
