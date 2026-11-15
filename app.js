// N3on Vault — static client. Semantic search = CLIP (transformers.js, local model) + keyword/tag scoring.
const $=s=>document.querySelector(s);
const state={items:[],q:'',f:{emotion:new Set(),setting:new Set(),who:new Set(),clothing:new Set(),shot:new Set()},favOnly:false,order:[],scores:null,lbIndex:-1};
let META,IMG,DSC,DIM=512,N=0;
const favs=new Set(JSON.parse(localStorage.getItem('n3on_favs')||'[]'));
const saveFavs=()=>{localStorage.setItem('n3on_favs',JSON.stringify([...favs]));$('#favcount').textContent=favs.size};
const toast=(m)=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),1800)};

// ---------- vocabulary: synonyms + vibes ----------
const SYN={smile:'smiling',smiles:'smiling',smiling:'smiling',happy:'smiling',grin:'smiling',grinning:'smiling',cheesing:'smiling',cheese:'smiling',joy:'smiling',
 laugh:'laughing',laughing:'laughing',lol:'laughing',lmao:'laughing',dying:'laughing',crying:'laughing',funny:'laughing',
 smug:'smug',smirk:'smug',smirking:'smug',cocky:'smug',confident:'smug',aura:'smug',mog:'smug',mogging:'smug',
 shocked:'shocked',shock:'shocked',surprised:'shocked',surprise:'shocked',wow:'shocked',omg:'shocked',stunned:'shocked',scared:'shocked',jawdrop:'shocked',
 sad:'sad',crying_:'sad',upset:'sad',depressed:'sad',down:'sad',hurt:'sad',
 angry:'angry',mad:'angry',pissed:'angry',furious:'angry',rage:'angry',
 calm:'calm',neutral:'calm',chill:'calm',relaxed:'calm',straight:'calm',blank:'calm',
 hype:'hype',hyped:'hype',excited:'hype',yelling:'hype',screaming:'hype',lit:'hype',turnt:'hype',energy:'hype',
 confused:'confused',confusion:'confused',huh:'confused',what:'confused',puzzled:'confused',thinking:'confused',
 disappointed:'disappointed',disappointment:'disappointed',letdown:'disappointed',unimpressed:'disappointed',done:'disappointed',
 serious:'serious',stare:'serious',staring:'serious',focused:'serious',mean:'serious',
 stream:'stream',streaming:'stream',desk:'stream',kick:'stream',setup:'stream',
 street:'street',city:'street',irl:'street',walking:'street',sidewalk:'street',
 car:'car',driving:'car',ride:'car',uber:'car',whip:'car',
 gym:'gym',boxing:'gym',ufc:'gym',fight:'gym',ring:'gym',workout:'gym',
 restaurant:'restaurant',food:'restaurant',eating:'restaurant',dinner:'restaurant',mukbang:'restaurant',cafe:'restaurant',
 event:'event',party:'event',club:'event',concert:'event',crowd:'event',
 home:'home',house:'home',room:'home',bedroom:'home',couch:'home',
 store:'store',shopping:'store',mall:'store',shop:'store',
 studio:'studio',podcast:'studio',interview:'studio',
 plane:'plane',jet:'plane',flight:'plane',
 outdoors:'outdoors',outside:'outdoors',beach:'outdoors',park:'outdoors',
 night:'night',nighttime:'night',
 hoodie:'hoodie',hoody:'hoodie',sweatshirt:'hoodie',tee:'t-shirt',tshirt:'t-shirt',shirt:'t-shirt',jacket:'jacket',coat:'jacket',suit:'suit',tux:'suit',dressed:'suit',
 jersey:'jersey',glasses:'glasses',specs:'glasses',sunglasses:'sunglasses',shades:'sunglasses',hat:'hat',cap:'hat',beanie:'hat',chain:'chain',jewelry:'chain',
 headphones:'headphones',headset:'headphones',bald:'shirtless',shirtless:'shirtless',wig:'costume',costume:'costume',tattoo:'tattoos',tattoos:'tattoos',
 kid:'throwback',young:'throwback',childhood:'throwback',throwback:'throwback',baby:'throwback',
 girl:'woman',woman:'woman',girlfriend:'woman',gf:'woman',date:'woman',lady:'woman',guy:'guy',man:'guy',dude:'guy',bro:'guy',friends:'group',group:'group',squad:'group',crew:'group',
 solo:'solo',alone:'solo',selfie:'close',closeup:'close',close:'close',face:'close'};
const VIBES=[
 [/caught lacking|lacking|caught off guard|off guard|candid/,{emotion:['shocked','confused','calm'],prompt:'a candid photo of a man caught off guard, surprised and unaware'}],
 [/took an? l\b|\bl\b|\bloss\b|lost|fumble|fumbled|it'?s over|cooked/,{emotion:['disappointed','sad','shocked'],prompt:'a photo of a disappointed defeated man'}],
 [/\bw\b|\bdub\b|winning|won|let'?s go|lets go|celebrat/,{emotion:['hype','smiling','laughing'],prompt:'a photo of a man celebrating, hyped and happy'}],
 [/crash(ing)? out|crashout|tweak|tweaking|lost it/,{emotion:['angry','hype','shocked'],prompt:'a photo of a man yelling and losing control'}],
 [/rizz|flirt|pull(ing)?\b/,{emotion:['smug','smiling'],who:['woman'],prompt:'a man smiling flirtatiously with a woman'}],
 [/locked in|focus|grind/,{emotion:['serious','calm'],prompt:'a focused serious man concentrating'}],
 [/side ?eye|suspicious|\bsus\b|judging/,{emotion:['smug','confused','serious'],prompt:'a man giving a suspicious side eye look'}],
 [/drip|flex|fit check|outfit|fashion|designer/,{clothing:['suit','jacket','chain','sunglasses'],prompt:'a man showing off a stylish expensive outfit'}],
 [/goofy|silly|clown|derp/,{emotion:['laughing','hype','shocked'],prompt:'a man making a goofy silly face'}],
 [/awkward|cringe|uncomfortable/,{emotion:['confused','calm','disappointed'],prompt:'an awkward uncomfortable man'}],
 [/proud|wholesome|cute/,{emotion:['smiling','calm'],prompt:'a wholesome sweet smiling man'}],
 [/tired|sleepy|exhausted|bored/,{emotion:['calm','disappointed'],prompt:'a tired bored man'}],
 [/money|rich|bag|paid|expensive/,{clothing:['chain','suit'],prompt:'a rich man flexing money and luxury'}],
 [/love|couple|hug|cuddl/,{who:['woman'],emotion:['smiling'],prompt:'a man hugging a woman affectionately'}],
 [/disgust|gross|ew\b|nasty/,{emotion:['disappointed','confused'],prompt:'a disgusted grossed out man'}],
 [/stare|staring|death stare|mean mug|mugging/,{emotion:['serious'],prompt:'a man staring intensely at the camera'}],
];
const FIELD_OF={};
const toks=s=>s.toLowerCase().replace(/[’']/g,"'").split(/[^a-z0-9'+-]+/).filter(Boolean);

// ---------- data ----------
async function load(){
  const [m,b]=await Promise.all([fetch('data.json').then(r=>r.json()),fetch('emb.bin').then(r=>r.arrayBuffer())]);
  META=m;N=m.count;DIM=m.dim;const all=new Int8Array(b);IMG=all.subarray(0,N*DIM);DSC=all.subarray(N*DIM,2*N*DIM);
  state.items=m.items.map((it,i)=>{it.i=i;const C=m.cats;
    it.text=[it.desc,C.emotion[it.emotion],...(it.emo2||[]),C.setting[it.setting],C.who[it.who],it.celeb||'',...it.clothing.map(c=>C.clothing[c]),...(it.tags||[]),C.shot[it.shot]].join(' ').toLowerCase();
    it.words=new Set(toks(it.text));return it});
  buildFilters();renderChips();update();
}
function inFilters(it){const f=state.f;
  if(state.favOnly&&!favs.has(it.id))return false;
  if(f.emotion.size&&!f.emotion.has(it.emotion))return false;
  if(f.setting.size&&!f.setting.has(it.setting))return false;
  if(f.who.size&&!f.who.has(it.who))return false;
  if(f.shot.size&&!f.shot.has(it.shot))return false;
  if(f.clothing.size&&![...f.clothing].every(c=>it.clothing.includes(c)))return false;
  return true}

// ---------- keyword scoring ----------
function kwScores(q){
  const out=new Float32Array(N);if(!q)return out;
  const words=toks(q).filter(w=>!['n3on','neon','a','the','in','with','of','and','is','he','his','on','at','looking','face','photo','pic','image','being'].includes(w));
  const want={emotion:{},setting:{},who:{},clothing:{},shot:{}};
  const add=(g,k,w)=>{want[g][k]=Math.max(want[g][k]||0,w)};
  const C=META.cats;
  for(const w of words){const s=SYN[w]||SYN[w.replace(/(ing|ed|s)$/,'')];if(!s)continue;
    if(C.emotion[s])add('emotion',s,3);else if(C.setting[s])add('setting',s,2.2);else if(C.clothing[s])add('clothing',s,2);else if(C.who[s])add('who',s,2);else if(C.shot[s])add('shot',s,1.2)}
  const lq=q.toLowerCase();let prompt=null;
  for(const [re,v] of VIBES){if(re.test(lq)){prompt=prompt||v.prompt;
    (v.emotion||[]).forEach((e,j)=>add('emotion',e,2.6-j*.5));(v.who||[]).forEach(e=>add('who',e,1.5));(v.clothing||[]).forEach(e=>add('clothing',e,1))}}
  const plain=words.filter(w=>!SYN[w]);
  for(const it of state.items){let s=0;
    if(want.emotion[it.emotion])s+=want.emotion[it.emotion];else for(const e of it.emo2||[])if(want.emotion[e]){s+=want.emotion[e]*.45;break}
    if(want.setting[it.setting])s+=want.setting[it.setting];
    if(want.who[it.who])s+=want.who[it.who];
    if(want.shot[it.shot])s+=want.shot[it.shot];
    for(const c of it.clothing)if(want.clothing[c])s+=want.clothing[c];
    for(const w of plain){if(w.length<3)continue;if(it.words.has(w))s+=1.2;else if(it.text.includes(w))s+=.6}
    out[it.i]=s}
  out.prompt=prompt;return out}

// ---------- CLIP (in-browser) ----------
let clip=null,clipState='idle';
function setAI(s,msg){clipState=s;const a=$('#ai');a.className='ai '+(s==='ready'?'ok':s==='loading'?'load':'');a.innerHTML='<i></i>'+msg}
async function initClip(){
  if(clip||clipState==='loading'||clipState==='failed')return;
  setAI('loading','loading AI search…');
  try{
    const T=await import('./vendor/transformers.min.js');
    T.env.allowRemoteModels=false;T.env.allowLocalModels=true;T.env.localModelPath=new URL('models/',location.href).href;
    T.env.backends.onnx.wasm.wasmPaths=new URL('vendor/',location.href).href;T.env.backends.onnx.wasm.numThreads=1;
    const id='Xenova/clip-vit-base-patch16';
    const [tok,model]=await Promise.all([T.AutoTokenizer.from_pretrained(id),T.CLIPTextModelWithProjection.from_pretrained(id,{dtype:'q8',device:'wasm'})]);
    clip=async(texts)=>{const inp=tok(texts,{padding:true,truncation:true});const {text_embeds}=await model(inp);
      const d=text_embeds.dims[1],data=text_embeds.data,res=[];for(let k=0;k<texts.length;k++){const v=data.slice(k*d,(k+1)*d);let n=0;for(const x of v)n+=x*x;n=Math.sqrt(n);res.push(v.map(x=>x/n))}return res};
    await clip(['warmup']);setAI('ready','AI vibe search on');if(state.q)update();
  }catch(e){console.warn('CLIP failed',e);setAI('failed','keyword search');}
}
const cache=new Map();
async function clipScores(q,prompt){
  const key=q+'|'+prompt;if(cache.has(key))return cache.get(key);
  const texts=['a photo of N3on '+q,q];if(prompt)texts.push(prompt);
  const E=await clip(texts);const qv=new Float32Array(DIM);E.forEach((e,j)=>{const w=j===2?0.8:1;for(let d=0;d<DIM;d++)qv[d]+=e[d]*w});
  let n=0;for(const x of qv)n+=x*x;n=Math.sqrt(n);for(let d=0;d<DIM;d++)qv[d]/=n;
  const qd=E[1];const si=new Float32Array(N),sd=new Float32Array(N);
  for(let i=0;i<N;i++){let a=0,b=0;const o=i*DIM;for(let d=0;d<DIM;d++){a+=IMG[o+d]*qv[d];b+=DSC[o+d]*qd[d]}si[i]=a*META.scale[i];sd[i]=b*META.dscale[i]}
  const r={si:z(si),sd:z(sd)};cache.set(key,r);return r}
function z(a){let m=0;for(const x of a)m+=x;m/=a.length;let v=0;for(const x of a)v+=(x-m)**2;v=Math.sqrt(v/a.length)||1;return a.map(x=>(x-m)/v)}

// ---------- ranking ----------
let seq=0;
async function update(){
  const my=++seq,q=state.q.trim();
  let cand=state.items.filter(inFilters);let scores=null;
  if(q){
    const kw=kwScores(q);const hasKw=kw.some(x=>x>0);
    if(clip){const {si,sd}=await clipScores(q,kw.prompt);if(my!==seq)return;
      scores=new Float32Array(N);for(let i=0;i<N;i++)scores[i]=0.55*si[i]+0.3*sd[i]+0.7*kw[i];
      cand.sort((a,b)=>scores[b.i]-scores[a.i]);
      const top=scores[cand[0]?.i]??0;cand=cand.filter((it,r)=>r<30||scores[it.i]>Math.max(top-2.6,0.9));
    }else{
      scores=kw;if(hasKw){cand=cand.filter(it=>kw[it.i]>0);cand.sort((a,b)=>kw[b.i]-kw[a.i])}
    }
  }
  state.order=cand;state.scores=scores;render();
}

// ---------- grid ----------
const grid=$('#grid');let cols=2,colW=0;const GAP=8;const nodes=new Map();
function layout(){
  const W=grid.clientWidth;cols=Math.max(2,Math.min(7,Math.floor(W/210)));colW=(W-GAP*(cols-1))/cols;
  const h=new Array(cols).fill(0);
  state.order.forEach(it=>{const n=nodes.get(it.id);let c=0;for(let k=1;k<cols;k++)if(h[k]<h[c]-1)c=k;
    const hh=colW*it.th/it.tw;n.style.width=colW+'px';n.style.height=hh+'px';n.style.left=(c*(colW+GAP))+'px';n.style.top=h[c]+'px';h[c]+=hh+GAP});
  grid.style.height=Math.max(0,...h)+'px'}
function card(it){
  const d=document.createElement('div');d.className='card';d.tabIndex=0;
  d.innerHTML=`<img loading="lazy" decoding="async" alt="">${''}<div class="ov"><span class="tg"></span><span class="qa"><button class="cp" title="Copy">📋</button><button class="dl" title="Download">⬇</button><button class="fav" title="Save">♥</button></span></div>`;
  const img=d.querySelector('img');img.onload=()=>img.classList.add('ld');img.src=it.thumb;img.alt=it.desc;
  d.querySelector('.tg').textContent=META.cats.emotion[it.emotion]+' · '+META.cats.setting[it.setting];
  d.addEventListener('click',e=>{const b=e.target.closest('button');
    if(b?.classList.contains('fav')){e.stopPropagation();toggleFav(it);return}
    if(b?.classList.contains('dl')){e.stopPropagation();download(it);return}
    if(b?.classList.contains('cp')){e.stopPropagation();copyImg(it);return}
    openLB(state.order.indexOf(it))});
  d.addEventListener('keydown',e=>{if(e.key==='Enter')openLB(state.order.indexOf(it))});
  return d}
function render(){
  const keep=new Set(state.order.map(i=>i.id));
  for(const [id,n] of nodes)if(!keep.has(id)){n.remove();nodes.delete(id)}
  state.order.forEach(it=>{let n=nodes.get(it.id);if(!n){n=card(it);nodes.set(it.id,n);grid.appendChild(n)}
    n.querySelector('.fav').classList.toggle('on',favs.has(it.id))});
  layout();
  $('#empty').hidden=state.order.length>0;
  const tot=state.items.length;$('#count').textContent=(state.q||activeCount()||state.favOnly)?`${state.order.length} of ${tot} images`+(state.q?' · best matches first':''):`${tot} images`;
}
addEventListener('resize',()=>{clearTimeout(layout.t);layout.t=setTimeout(layout,120)});

// ---------- filters UI ----------
const GROUPS=[['emotion','Emotion'],['setting','Setting'],['who',"Who's in it"],['clothing','Wearing / style'],['shot','Shot type']];
function counts(g){const c={};for(const it of state.items){const vals=g==='clothing'?it.clothing:[it[g]];for(const v of vals)c[v]=(c[v]||0)+1}return c}
function buildFilters(){
  const box=$('#groups');box.innerHTML='';
  for(const [g,label] of GROUPS){const c=counts(g);const el=document.createElement('div');el.className='grp';el.innerHTML=`<h4>${label}</h4><div class="opts"></div>`;
    const opts=el.querySelector('.opts');
    Object.entries(META.cats[g]).filter(([k])=>c[k]).forEach(([k,lab])=>{const b=document.createElement('button');b.className='opt';b.dataset.g=g;b.dataset.k=k;b.innerHTML=`${lab}<small>${c[k]}</small>`;
      b.onclick=()=>toggleF(g,k);opts.appendChild(b)});
    box.appendChild(el)}
}
function activeCount(){return Object.values(state.f).reduce((a,s)=>a+s.size,0)}
function toggleF(g,k){const s=state.f[g];s.has(k)?s.delete(k):s.add(k);syncF();update()}
function syncF(){document.querySelectorAll('.opt').forEach(b=>b.classList.toggle('on',state.f[b.dataset.g].has(b.dataset.k)));
  const n=activeCount();$('#fcount').textContent=n||'';renderChips()}
const QUICK=['smiling','laughing','smug','shocked','hype','confused','calm','serious'];
function renderChips(){
  const c=$('#chips');c.innerHTML='';
  for(const [g,s] of Object.entries(state.f))for(const k of s)if(!(g==='emotion'&&QUICK.includes(k))){const b=document.createElement('button');b.className='chip x';b.textContent=META.cats[g][k]+'  ✕';b.onclick=()=>toggleF(g,k);c.appendChild(b)}
  for(const k of QUICK){if(!META.cats.emotion[k])continue;const b=document.createElement('button');b.className='chip'+(state.f.emotion.has(k)?' on':'');b.textContent=META.cats.emotion[k];b.onclick=()=>toggleF('emotion',k);c.appendChild(b)}
  for(const k of ['stream','car','gym','event','street']){const b=document.createElement('button');b.className='chip'+(state.f.setting.has(k)?' on':'');b.textContent=META.cats.setting[k];b.onclick=()=>toggleF('setting',k);c.appendChild(b)}
}
const panel=$('#panel'),scrim=$('#scrim');
const openP=o=>{panel.classList.toggle('open',o);scrim.classList.toggle('on',o);panel.setAttribute('aria-hidden',!o)};
$('#filterbtn').onclick=()=>openP(true);$('#closep').onclick=()=>openP(false);scrim.onclick=()=>openP(false);
$('#resetf').onclick=()=>{Object.values(state.f).forEach(s=>s.clear());syncF();update()};
$('#favbtn').onclick=()=>{state.favOnly=!state.favOnly;$('#favbtn').setAttribute('aria-pressed',state.favOnly);if(state.favOnly&&!favs.size)toast('No saved images yet — tap ♥ on any image');update()};

// ---------- search box ----------
const qi=$('#q');let deb;
qi.addEventListener('input',()=>{state.q=qi.value;$('#clearq').style.display=qi.value?'block':'none';initClip();clearTimeout(deb);deb=setTimeout(update,220)});
qi.addEventListener('focus',initClip);
qi.addEventListener('keydown',e=>{if(e.key==='Enter'){qi.blur();clearTimeout(deb);update()}});
$('#clearq').onclick=()=>{qi.value='';state.q='';$('#clearq').style.display='none';update()};

// ---------- actions ----------
function toggleFav(it){favs.has(it.id)?favs.delete(it.id):favs.add(it.id);saveFavs();
  nodes.get(it.id)?.querySelector('.fav').classList.toggle('on',favs.has(it.id));if(state.lbIndex>=0)lbFavUI();toast(favs.has(it.id)?'Saved to favorites':'Removed from favorites');if(state.favOnly)update()}
function fname(it){return it.full.split('/').pop()}
async function download(it){
  try{const r=await fetch(it.full);const b=await r.blob();const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=fname(it);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Downloading full quality')}
  catch(e){window.open(it.full,'_blank')}}
function pngBlob(it){return new Promise((res,rej)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);c.toBlob(b=>b?res(b):rej(new Error('blob')),'image/png')};im.onerror=rej;im.src=it.full})}
async function copyImg(it){
  if(!window.ClipboardItem||!navigator.clipboard?.write){toast('Copy not supported here — long-press the image instead');return}
  try{await navigator.clipboard.write([new ClipboardItem({'image/png':pngBlob(it)})]);toast('Copied image ✓')}
  catch(e){console.warn(e);toast('Copy blocked — long-press / right-click the image')}}

// ---------- lightbox ----------
const lb=$('#lb'),lbimg=$('#lbimg');
function openLB(i){if(i<0)return;state.lbIndex=i;const it=state.order[i];lb.hidden=false;document.body.style.overflow='hidden';
  lbimg.src=it.thumb;const full=new Image();full.onload=()=>{if(state.order[state.lbIndex]===it)lbimg.src=it.full};full.src=it.full;
  $('#lbdesc').textContent=it.desc;const C=META.cats;
  const tg=[['emotion',it.emotion],['setting',it.setting],['who',it.who],['shot',it.shot],...it.clothing.map(c=>['clothing',c])];
  $('#lbtags').innerHTML='';tg.forEach(([g,k])=>{const s=document.createElement('span');s.textContent=C[g][k];s.title='Filter by '+C[g][k];s.onclick=()=>{closeLB();if(!state.f[g].has(k))toggleF(g,k)};$('#lbtags').appendChild(s)});
  if(it.celeb){const s=document.createElement('span');s.textContent=it.celeb;$('#lbtags').appendChild(s)}
  $('#lbdl').href=it.full;$('#lbdl').setAttribute('download',fname(it));
  $('#lbmeta').textContent=`${it.w}×${it.h}px`+(it.enh?' · AI-enhanced':'')+(it.added?' · added '+it.added:'');lbFavUI()}
function lbFavUI(){const it=state.order[state.lbIndex];if(!it)return;const on=favs.has(it.id);const b=$('#lbfav');b.classList.toggle('on',on);b.textContent=on?'♥ Saved':'♡ Save'}
function closeLB(){lb.hidden=true;state.lbIndex=-1;document.body.style.overflow='';lbimg.removeAttribute('src')}
$('#lbclose').onclick=closeLB;$('#lbprev').onclick=()=>openLB(Math.max(0,state.lbIndex-1));$('#lbnext').onclick=()=>openLB(Math.min(state.order.length-1,state.lbIndex+1));
$('#lbdl').onclick=e=>{e.preventDefault();download(state.order[state.lbIndex])};
$('#lbcopy').onclick=()=>copyImg(state.order[state.lbIndex]);$('#lbfav').onclick=()=>toggleFav(state.order[state.lbIndex]);
lb.addEventListener('click',e=>{if(e.target===lb||e.target.classList.contains('lbimgwrap'))closeLB()});
addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')closeLB();if(e.key==='ArrowRight')$('#lbnext').click();if(e.key==='ArrowLeft')$('#lbprev').click()});
let tx=null;lb.addEventListener('touchstart',e=>{tx=e.touches[0].clientX},{passive:true});
lb.addEventListener('touchend',e=>{if(tx==null)return;const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>60)(dx<0?$('#lbnext'):$('#lbprev')).click();tx=null});

saveFavs();setAI('idle','tap search for AI vibe search');
load().then(()=>{('requestIdleCallback' in window?requestIdleCallback:setTimeout)(()=>initClip(),{timeout:2500})}).catch(e=>{console.error(e);$('#count').textContent='Failed to load library'});
