/** Readable caption units estimated from a recorded clip's own fraction.
 * Character weights are not word timestamps and never create another clock. */
export const NARRATION_SENTENCE_MAX_CHARS=42;

export function splitNarrationSentences(text:string):string[]{
 const chars=Array.from(text.trim()),parts:string[]=[];
 const append=(value:string)=>{
  let rest=Array.from(value.trim());
  while(rest.length>NARRATION_SENTENCE_MAX_CHARS){
   let end=NARRATION_SENTENCE_MAX_CHARS;
   // Keep a listed event with its date instead of cutting a Chinese year in
   // half. These are display ranges only; the recording's word clock is intact.
   for(let index=end-1;index>=end/2;index--)if(/[、：:\s]/u.test(rest[index])){end=index+1;break;}
   const part=rest.slice(0,end).join('').trim();if(part)parts.push(part);
   rest=rest.slice(end);
  }
  const part=rest.join('').trim();if(part)parts.push(part);
 };
 const englishStop=(index:number)=>{
  if(/\d/u.test(chars[index-1]??'')&&/\d/u.test(chars[index+1]??''))return false;
  if(index===chars.length-1)return true;
  if(!/[\s”’"')\]]/u.test(chars[index+1]))return false;
  const left=chars.slice(0,index+1).join('');
  if(/\b(?:e\.g|i\.e|etc|Dr|Mr|Mrs|Ms|Prof|Sr|Jr|St|vs|Fig|No)\.$/iu.test(left)||/(?:\b[A-Za-z]\.){2,}$/u.test(left)||/(?:^|\s)[A-Z]\.$/u.test(left))return false;
  return /^[\s”’"')\]]*[A-Z\p{Script=Han}“‘"]/u.test(chars.slice(index+1).join(''));
 };
 let start=0;
 for(let index=0;index<chars.length;index++){
  const char=chars[index];
  if(!'。！？；，!?;\n'.includes(char)&&!(char==='.'&&englishStop(index)))continue;
  let end=index+1;
  while(end<chars.length&&'”’」』》）】"'.includes(chars[end]))end++;
  append(chars.slice(start,end).join(''));start=end;index=end-1;
 }
 append(chars.slice(start).join(''));
 return parts;
}

/** Pure lookup: pause, manual seek and backwards movement select identically. */
export function narrationSentence(text:string,fraction:number):string{
 const parts=splitNarrationSentences(text);if(!parts.length)return '';
 const progress=Number.isFinite(fraction)?Math.max(0,Math.min(1,fraction)):0;
 const weights=parts.map(part=>Array.from(part).filter(char=>! /\s/u.test(char)).length);
 const total=weights.reduce((sum,weight)=>sum+weight,0);
 let cumulative=0;
 for(let index=0;index<parts.length;index++){
  cumulative+=weights[index];
  if(progress<cumulative/total||index===parts.length-1)return parts[index];
 }
 return '';
}
