import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir='qa/mainline-closeout-20261018/browser';
const publicDir='public/project-review';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const evidence=read(`${dir}/playback-evidence.json`);
const result={
  date:'2026-10-18', baseline:'V1-main-20261018.1', testedCommit:'7f11896',
  scope:'当前真实浏览器六章自然播放、关键比较恢复、计划保存/刷新/返回；非逐帧录屏、非系统声音听审或首次观看者理解验收。',
  access:{status:'available',method:'原有 cua 浏览器接口、原URL http://127.0.0.1:5176/#/overview',details:'重新读取工具文档和清单后，原接口正常取得页面。没有改安全配置、端口或传输方式；未查明先前拒绝为什么消失，不能声称修复了安全策略。'},
  playback:{start:evidence[0].at,end:evidence.find(e=>e.stage==='natural-completion').at,chapters:6,beats:21,programmeSeconds:701.424,observations:evidence.length,ended:true,automaticLoop:false,method:'从首页进入第一章，点击开始；章节自然衔接，期间只进行原地比较/恢复及计划往返，没有用章节跳转或主进度快进代替整场播放。截图和DOM为离散观察，未连续记录每一帧。'},
  synchronization:{status:'browser_media_clock_and_visible_scene_checked',observed:'播放期间字幕为 recording-word，活动词、说明、标注和演示阶段相应推进；操作暂停字幕，恢复回到原句。已结合实际播放器以 audio.currentTime 驱动的实现核查。',limit:'工具没有系统声音回录/监听能力。本轮未听审扬声器输出、发音、响度或全程主观口型式同步；不能把可见时钟对应写成逐句听感验收。'},
  operations:[
    {id:'rotation',result:'passed',detail:'同进度去掉/加入自转项；讲述暂停在0.213，恢复约0.218，原地球纬圈阶段恢复。'},
    {id:'moisture',result:'passed',detail:'气团位置0.85保持相同，较多/较少水汽的云雨与对照表改变；主进度0.745不动，恢复较多水汽并继续。'},
    {id:'month',result:'passed',detail:'冬季讲述中改七月；数值改变，恢复一月与原句，主进度0.413→0.425。'},
    {id:'life-section',result:'passed',detail:'林芝东西→南北剖面，样本3780→5030米；恢复东西剖面与原句，0.811→0.820。读数是当前样本，不是城市海拔。'},
    {id:'irrigation',result:'passed',detail:'重新对照；仅开闸推进无补水，清渠后可补水，关闸保留已完成部分；原句0.573→0.582恢复。'},
    {id:'protection',result:'passed',detail:'原有供灯关系/空间分开在同图改变灯光位置与解释；主进度0.620不变，恢复原保护段。'},
    {id:'bridge',result:'passed',detail:'拿掉/接回桥改变桥面和接续状态；恢复原段0.496→0.503。截图未连续跟踪每一辆车。'},
    {id:'rail',result:'passed',detail:'跨河节点3.39公里→前进500米到3.89公里；恢复原隧道讲述，原进度0.541→0.543。'},
    {id:'plan',result:'passed',detail:'末章0.344带入拉萨观察问题和3项资料；添加临时笔记、保存、真实reload后逐字一致。恢复原笔记后保存返回，仍为原段0.344、同一句/活动字，继续至自然结束。随后重进计划确认原笔记已恢复。'}
  ],
  browserWarningsAndErrors:[],
  conclusion:'可冻结本版主线功能；浏览器访问、操作恢复和计划保存返回的验证缺口已补。R3可运行与可见对应部分完成；系统声音听审及正式理解验收保持未完成，不宣称完整体验全部验收通过。',
  limits:['正式首次观看者仍0/3，本轮是助手检查，不替代理解证据。','没有新增内容、模型、音频或时长；没有重新核验全部外部事实与实时交通。','低分辨率地区概览和部分桥梁/地形标记在整体画面中仍偏小；本轮未见它们阻断播放或返回，列后续可读性工作，不开启新的模型打磨。','本轮截图横向空间随应用面板从1280×720变化至845×871，未进行手机专项。'],
  evidence:'qa/mainline-closeout-20261018/browser/playback-evidence.json',
};
write(`${dir}/report.json`,result);
write(`${publicDir}/browser-verification.json`,result);
const r=read(`${publicDir}/closeout.json`);
r.type='主线浏览器实播与操作收口记录';
r.verdict=result.conclusion;
r.changesThisRun='原浏览器接口现已可访问。完成一次首页到自然结束的实播与关键操作检查；只更新验收记录，无产品内容、模型、镜头、音频或时长变动。';
r.browserVerification=result;
r.checks.scope+=' 这是上一轮程序检查，本轮没有把86项重新运行或充当浏览器证据。';
const limitsByChapter={
 location:'本轮已见完整地球与亚洲/国家/自治区范围、逐词字幕和自然衔接；未新增观看者指认或复述证据。',
 environment:'实际检查自转与水汽对照、原句恢复、来流→形成→高程→云雨过渡；系统音频听感未验证。',
 differences:'实际看到七月/一月同图读数，切月恢复原月份与原句；未再次核验外部统计源站。',
 living:'真实浏览器完成方向对照及开闸/清渠/补水/关闸恢复；整体视图里的局部细节仍可更清晰，未扩大本轮范围。',
 'human-history':'实际看到形成→保护→交通自然衔接及供灯空间对照/恢复；不把现状模型当历史复原，未完成首次观看者理解验证。',
 today:'完整播放经过地区联系、真实河谷与观察收束；沿线操作恢复，计划保存/reload/返回原句已实际通过。声音输出听审仍未完成。'
};
for(const c of r.chapters)c.limit=limitsByChapter[c.id];
const r3=r.mustFix.find(x=>x.id==='R3');
r3.status='browser_functional_verified_audio_listening_pending';
r3.resolution=result.conclusion+' 详见 browser-verification.json 与本轮截图/DOM记录。';
r3.evidence.push('qa/mainline-closeout-20261018/browser/report.json','qa/mainline-closeout-20261018/browser/playback-evidence.json');
r.limits=result.limits.concat(result.synchronization.limit);
r.closure.sequence=['R1/R2已关闭；R3浏览器可运行、可见对应、操作恢复与保存返回已检查。','冻结当前六章21段主线，不继续重复播放美容。','系统声音听审及正式首次观看者理解验收仍为独立未完成项，不能以本轮浏览器检查替代。','只在有具体故障、事实错误或真实理解证据时重开对应问题。'];
r.closure.stopRule='本版功能检查未见新的阻断，可冻结可用V1；完整体验验收仍保留声音听审与理解证据边界。';
write(`${publicDir}/closeout.json`,r);write(`${publicDir}/review.json`,r);
fs.mkdirSync(`${publicDir}/browser-evidence`,{recursive:true});
for(const name of ['05-protection-separated.jpg','06-rail-crossing.jpg','07-plan-return.jpg','08-complete.jpg'])fs.copyFileSync(`${dir}/${name}`,`${publicDir}/browser-evidence/${name}`);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const chapters=r.chapters.map((c,i)=>`<article class="chapter"><h3>${i+1}. ${esc(c.title)}</h3><dl><dt>逻辑</dt><dd>${esc(c.logic)}</dd><dt>保留的收口标准</dt><dd>${esc(c.gate)}</dd><dt>本轮实际检查与限制</dt><dd>${esc(c.limit)}</dd></dl></article>`).join('');
const operations=result.operations.map(o=>`<tr><th>${esc(o.id)}</th><td>已检查</td><td>${esc(o.detail)}</td></tr>`).join('');
const common=`<section class="hero"><p class="eyebrow">2026-10-18 · ${r.baseline} · 实测代码 7f11896</p><h1>本版主线功能可以冻结。<br>浏览器实播已走通。</h1><p class="lead">六章、21段、11:41。从首页自然播放到结束，完成比较恢复与观察计划保存、刷新、返回。</p><p>应用入口仍直接进入效果演示，本页只是项目说明。</p></section><aside class="notice"><strong>功能实播完成，完整体验验收仍有明确边界。</strong><p>本轮使用原浏览器接口和原URL，未修改安全策略或绕行。字幕按原生录音字时间推进，画面与操作已实际检查；工具不提供系统声音回录，未完成扬声器输出与发音听审。首次观看者理解验收仍0/3。</p></aside><section id="intent"><h2>原始认识路线</h2><p>完整地球定位 → 全球来流与高原 → 地区差异 → 条件、设施与人的生活 → 历史形成及保护延续 → 交通、地方观察与可保存计划。整体到局部，再回到整体；真实资料与原理示意分清。</p></section><section id="verdict"><h2>收口决定</h2><ul><li>R1 历史衔接：已关闭，本轮实际见到形成→大昭寺保护→现代交通。</li><li>R2 统一版本：已关闭，仍固定21段录音和701.424秒；原86项程序结果保留为上一轮证据。</li><li>R3 浏览器：首页进入、自然播放结束、关键操作恢复和计划保存/reload/返回已检查；声音听审仍未完成。</li></ul><p>建议冻结可用V1，停止加模型、加时长和整场美容循环。不要将“还能更漂亮”继续升级为本版阻断，也不把功能检查冒充所有体验已通过。</p></section><section><h2>实际操作证据</h2><div class="table-wrap"><table><thead><tr><th>操作</th><th>状态</th><th>观察结果</th></tr></thead><tbody>${operations}</tbody></table></div><p>没有跳章节或拖主进度快进替代全程。55条离散记录与关键截图，非逐帧录屏；本轮浏览器捕获的警告/错误日志为空。</p></section>`;
const tail=`<section><h2>本轮画面</h2><figure><img style="max-width:100%;height:auto" src="browser-evidence/07-plan-return.jpg" alt="计划保存刷新后返回原讲述34%"><figcaption>保存、刷新后返回原段34%，字幕仍为原句。</figcaption></figure><figure><img style="max-width:100%;height:auto" src="browser-evidence/08-complete.jpg" alt="六章自然播放结束11分41秒"><figcaption>继续后自然结束，11:41 / 11:41。</figcaption></figure></section><section id="limits"><h2>后续与限制</h2><ul>${result.limits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p>新增事实、模型、更高清资料、移动端或完整旅行服务均另立需求，不延长本版。系统声音听审和正式理解验收保持独立记录，不要求当前用户逐项陪测。</p></section><section><h2>可追溯记录</h2><p><a href="browser-verification.json">本轮浏览器记录</a> · <a href="closeout.json">当前六章收口记录</a> · <a href="release-baseline.json">固定版本基线</a> · <a href="closeout-audit.html">修复前排查（历史）</a> · <a href="phase-review.html">原始思路与阶段记录（历史）</a> · <a href="first-viewer/index.html">首次观看者协议（未完成）</a></p></section>`;
for(const [file,detailed] of [['index.html',false],['closeout.html',true]])fs.writeFileSync(`${publicDir}/${file}`,`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>主线实播收口 · 西藏探索</title><link rel="stylesheet" href="review.css"></head><body><header><a class="brand" href="/#/overview">西藏探索 · 返回效果演示</a><nav><a href="index.html">项目说明</a><a href="closeout.html">六章详细清单</a><a href="release-baseline.json">版本基线</a></nav></header><main>${common}${detailed?`<section><h2>六章检查</h2>${chapters}</section>`:''}${tail}</main></body></html>\n`);
write(`${dir}/evidence-manifest.json`,fs.readdirSync(dir).filter(n=>n.endsWith('.jpg')||n==='playback-evidence.json').map(name=>({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex')})));
console.log('Updated current review records; product source and frozen baseline untouched.');
