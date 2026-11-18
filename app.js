// N3on Vault — static client. Semantic search = CLIP (transformers.js, local model) + keyword/tag scoring.
const $=s=>document.querySelector(s);
const state={items:[],q:'',f:{emotion:new Set(),setting:new Set(),who:new Set(),clothing:new Set(),shot:new Set()},favOnly:false,order:[],scores:null,lbIndex:-1};
let META,IMG,DSC,DIM=512,N=0;
// ---------- streamer switcher: ?s=<slug>; n3on lives at the root, others under p/<slug>/ ----------
const PEOPLE_FALLBACK=[{slug:'n3on',name:'N3on'}];
const SLUG=(new URLSearchParams(location.search).get('s')||'n3on').toLowerCase().replace(/[^a-z0-9_-]/g,'');
const BASE=SLUG==='n3on'?'':`p/${SLUG}/`;
let PERSON={slug:SLUG,name:SLUG==='n3on'?'N3on':SLUG,first:SLUG};
const FKEY=SLUG==='n3on'?'n3on_favs':SLUG+'_favs';
const favs=new Set(JSON.parse(localStorage.getItem(FKEY)||'[]'));
const saveFavs=()=>{localStorage.setItem(FKEY,JSON.stringify([...favs]));$('#favcount').textContent=favs.size};
const toast=(m)=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),1800)};

// ---------- vocabulary: synonyms + vibes ----------
const SYN={smile:'smiling',smiles:'smiling',smiling:'smiling',happy:'smiling',grin:'smiling',grinning:'smiling',cheesing:'smiling',cheese:'smiling',joy:'smiling',
 laugh:'laughing',laughing:'laughing',lol:'laughing',lmao:'laughing',funny:'laughing',
 hysterical:'hysterical',hysterically:'hysterical',dying:'hysterical',crying:'hysterical',lmfao:'hysterical',rofl:'hysterical',wheezing:'hysterical',wheeze:'hysterical',dead:'hysterical',weak:'hysterical',
 smug:'smug',smirk:'smug',smirking:'smug',cocky:'smug',confident:'smug',aura:'smug',mog:'smug',mogging:'smug',
 shocked:'shocked',shock:'shocked',surprised:'shocked',surprise:'shocked',wow:'shocked',omg:'shocked',stunned:'shocked',jawdrop:'shocked',gasp:'shocked',speechless:'shocked',
 disbelief:'disbelief',unbelievable:'disbelief',nah:'disbelief',bruh:'disbelief',deadass:'disbelief',really:'disbelief',
 scared:'scared',scary:'scared',afraid:'scared',fear:'scared',terrified:'scared',spooked:'scared',frightened:'scared',
 confused:'confused',confusion:'confused',huh:'confused',what:'confused',puzzled:'confused',lost:'confused',wtf:'confused',
 suspicious:'suspicious',sus:'suspicious',sideeye:'suspicious',skeptical:'suspicious',doubt:'suspicious',judging:'suspicious',squint:'suspicious',
 disgusted:'disgusted',disgust:'disgusted',gross:'disgusted',ew:'disgusted',eww:'disgusted',nasty:'disgusted',yuck:'disgusted',
 cringe:'cringe',cringing:'cringe',cringy:'cringe',grimace:'cringe',yikes:'cringe',oof:'cringe',
 awkward:'awkward',uncomfortable:'awkward',weird:'awkward',
 nervous:'nervous',anxious:'nervous',worried:'nervous',stressed:'nervous',sweating:'nervous',sweaty:'nervous',
 embarrassed:'embarrassed',shy:'embarrassed',blushing:'embarrassed',ashamed:'embarrassed',facepalm:'embarrassed',
 annoyed:'annoyed',irritated:'annoyed',fedup:'annoyed',eyeroll:'annoyed',bothered:'annoyed',
 sad:'sad',upset:'sad',depressed:'sad',down:'sad',hurt:'sad',heartbroken:'sad',
 angry:'angry',mad:'angry',pissed:'angry',furious:'angry',rage:'angry',raging:'angry',
 calm:'calm',neutral:'calm',chill:'calm',relaxed:'calm',straight:'calm',blank:'calm',
 hype:'hype',hyped:'hype',excited:'hype',yelling:'hype',screaming:'hype',lit:'hype',turnt:'hype',energy:'hype',
 disappointed:'disappointed',disappointment:'disappointed',letdown:'disappointed',unimpressed:'disappointed',done:'disappointed',
 serious:'serious',stare:'serious',staring:'serious',mean:'serious',
 focused:'focused',focus:'focused',concentrating:'focused',lockedin:'focused',
 thinking:'thinking',thoughtful:'thinking',pondering:'thinking',hmm:'thinking',hmmm:'thinking',
 flirty:'flirty',flirt:'flirty',flirting:'flirty',rizz:'flirty',charming:'flirty',
 proud:'proud',pride:'proud',
 tired:'tired',sleepy:'tired',exhausted:'tired',bored:'tired',
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
 [/caught lacking|lacking|caught off guard|off guard|candid/,{emotion:['shocked','confused','awkward'],prompt:'a candid photo of a man caught off guard, surprised and unaware'}],
 [/took an? l\b|\bl\b|\bloss\b|fumble|fumbled|it'?s over|cooked/,{emotion:['disappointed','sad','shocked'],prompt:'a photo of a disappointed defeated man'}],
 [/\bw\b|\bdub\b|winning|won|let'?s go|lets go|celebrat/,{emotion:['hype','smiling','laughing'],prompt:'a photo of a man celebrating, hyped and happy'}],
 [/crash(ing)? out|crashout|tweak|tweaking|lost it/,{emotion:['angry','hype','shocked'],prompt:'a photo of a man yelling and losing control'}],
 [/rizz|flirt|pull(ing)?\b/,{emotion:['flirty','smug','smiling'],who:['woman'],prompt:'a man smiling flirtatiously with a woman'}],
 [/locked in|focus|grind/,{emotion:['focused','serious'],prompt:'a focused serious man concentrating'}],
 [/side ?eye|suspicious|\bsus\b|judging|skeptic/,{emotion:['suspicious','annoyed','smug'],prompt:'a man giving a suspicious side eye look'}],
 [/drip|flex|fit check|outfit|fashion|designer/,{clothing:['suit','jacket','chain','sunglasses'],prompt:'a man showing off a stylish expensive outfit'}],
 [/goofy|silly|clown|derp/,{emotion:['hysterical','laughing','hype'],prompt:'a man making a goofy silly face'}],
 [/awkward|uncomfortable/,{emotion:['awkward','cringe','nervous'],prompt:'an awkward uncomfortable man'}],
 [/cringe|yikes|secondhand/,{emotion:['cringe','awkward','disgusted'],prompt:'a man cringing and grimacing'}],
 [/proud|wholesome|cute/,{emotion:['proud','smiling'],prompt:'a wholesome proud smiling man'}],
 [/tired|sleepy|exhausted|bored/,{emotion:['tired','calm'],prompt:'a tired bored man'}],
 [/money|rich|bag|paid|expensive/,{clothing:['chain','suit'],prompt:'a rich man flexing money and luxury'}],
 [/love|couple|hug|cuddl/,{who:['woman'],emotion:['smiling','flirty'],prompt:'a man hugging a woman affectionately'}],
 [/disgust|gross|\bew+\b|nasty|yuck/,{emotion:['disgusted','cringe'],prompt:'a disgusted grossed out man'}],
 [/\bmog|mogg|looksmax|sigma|\baura\b/,{emotion:['smug','serious'],prompt:'a confident handsome man with a sharp jawline looking dominant and stylish'}],
 [/stare|staring|death stare|mean mug|mugging/,{emotion:['serious','annoyed'],prompt:'a man staring intensely at the camera'}],
 [/jaw ?drop|mouth open|no way|can'?t believe|nah+ ?(bro|man)?|bruh|what the/,{emotion:['shocked','disbelief','confused'],prompt:'a shocked man with his jaw dropped in disbelief'}],
 [/\bhuh\b|wait what|\bwhat\b|confus|lost|\?{2,}/,{emotion:['confused','disbelief','thinking'],prompt:'a confused puzzled man'}],
 [/scared|scary|spooked|afraid|horror|jumpscare/,{emotion:['scared','shocked','nervous'],prompt:'a scared frightened man'}],
 [/nervous|anxious|sweat|stress|worried/,{emotion:['nervous','awkward','scared'],prompt:'a nervous anxious man'}],
 [/embarrass|shy|blush|facepalm/,{emotion:['embarrassed','awkward','laughing'],prompt:'an embarrassed man covering his face'}],
 [/annoyed|irritat|fed up|eye ?roll|unbothered/,{emotion:['annoyed','disappointed','serious'],prompt:'an annoyed irritated man'}],
 [/thinking|hmm+|ponder|plotting|scheming/,{emotion:['thinking','suspicious','focused'],prompt:'a thoughtful man thinking'}],
 [/dying|hysteric|crying laugh|wheez|can'?t breathe|lmfao/,{emotion:['hysterical','laughing'],prompt:'a man laughing hysterically'}],
];
const FIELD_OF={};
const toks=s=>s.toLowerCase().replace(/[’']/g,"'").split(/[^a-z0-9'+-]+/).filter(Boolean);

// ---------- data ----------
async function loadPeople(){
  let P=PEOPLE_FALLBACK;try{P=await fetch('people.json',{cache:'no-cache'}).then(r=>r.json())}catch(e){}
  const me=P.find(p=>p.slug===SLUG);if(me)PERSON=me;
  const nm=PERSON.name;document.title=`${nm} Vault — reaction image library`;
  $('#logo').textContent=nm.toUpperCase();
  $('#q').placeholder=`Search a vibe… “caught lacking”, “smug in a hoodie”`;
  const menu=$('#pmenu');menu.innerHTML='';
  for(const p of P){const a=document.createElement('a');a.href=p.slug==='n3on'?'./':`./?s=${p.slug}`;a.className='pitem'+(p.slug===SLUG?' on':'');
    a.innerHTML=`<b>${p.name}</b><small>${p.count?p.count+' images':''}</small>`;menu.appendChild(a)}
}
async function load(){
  await loadPeople();
  const m=await fetch(BASE+'data.json').then(r=>r.json());   // embeddings (emb.bin) load lazily, only when AI search is used
  if(BASE)m.items.forEach(it=>{it.full=BASE+it.full;it.thumb=BASE+it.thumb});
  META=m;N=m.count;DIM=m.dim;
  state.items=m.items.map((it,i)=>{it.i=i;const C=m.cats;
    it.emos=it.emos||[it.emotion];it.text=[it.desc,...it.emos.map(e=>C.emotion[e]||e),C.setting[it.setting],C.who[it.who],it.celeb||'',...it.clothing.map(c=>C.clothing[c]),...(it.tags||[]),C.shot[it.shot]].join(' ').toLowerCase();
    it.words=new Set(toks(it.text));return it});
  buildFilters();renderChips();update();
}
function inFilters(it){const f=state.f;
  if(state.favOnly&&!favs.has(it.id))return false;
  if(f.emotion.size&&!it.emos.some(e=>f.emotion.has(e)))return false;
  if(f.setting.size&&!f.setting.has(it.setting))return false;
  if(f.who.size&&!f.who.has(it.who))return false;
  if(f.shot.size&&!f.shot.has(it.shot))return false;
  if(f.clothing.size&&![...f.clothing].every(c=>it.clothing.includes(c)))return false;
  return true}

// ---------- keyword scoring ----------
function kwScores(q){
  const out=new Float32Array(N);if(!q)return out;
  const words=toks(q).filter(w=>!['n3on','neon',...toks(PERSON.name),'a','the','in','with','of','and','is','he','his','on','at','looking','face','photo','pic','image','being'].includes(w));
  const want={emotion:{},setting:{},who:{},clothing:{},shot:{}};
  const add=(g,k,w)=>{want[g][k]=Math.max(want[g][k]||0,w)};
  const C=META.cats;
  for(const w of words){const s=SYN[w]||SYN[w.replace(/(ing|ed|s)$/,'')];if(!s)continue;
    if(C.emotion[s])add('emotion',s,3);else if(C.setting[s])add('setting',s,2.2);else if(C.clothing[s])add('clothing',s,2);else if(C.who[s])add('who',s,2);else if(C.shot[s])add('shot',s,1.2)}
  const lq=q.toLowerCase();let prompt=null;
  for(const [re,v] of VIBES){if(re.test(lq)){prompt=prompt||v.prompt;
    (v.emotion||[]).forEach((e,j)=>add('emotion',e,2.6-j*.5));(v.who||[]).forEach(e=>add('who',e,1.5));(v.clothing||[]).forEach(e=>add('clothing',e,1))}}
  const plain=words.filter(w=>!SYN[w]);
  const mogQ=/\bmog|mogg|looksmax|sigma/.test(lq);
  for(const it of state.items){let s=0;
    if(mogQ&&it.words.has('mog'))s+=4;
    if(want.emotion[it.emotion])s+=want.emotion[it.emotion];else{let b=0;for(const e of it.emos)if(want.emotion[e])b=Math.max(b,want.emotion[e]*.75);s+=b}
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
let embP=null;
function loadEmb(){return embP||(embP=fetch(BASE+'emb.bin').then(r=>r.arrayBuffer()).then(b=>{const all=new Int8Array(b);IMG=all.subarray(0,N*DIM);DSC=all.subarray(N*DIM,2*N*DIM)}))}
function workerClip(){return new Promise((res,rej)=>{
  const w=new Worker(new URL('clipworker.js',location.href),{type:'module'});let id=0;const pend=new Map();
  w.onmessage=e=>{const p=pend.get(e.data.id);if(!p)return;pend.delete(e.data.id);e.data.ok?p.ok(e.data.res):p.err(new Error(e.data.err))};
  w.onerror=e=>{for(const p of pend.values())p.err(e);pend.clear();rej(e)};
  const call=(msg)=>new Promise((ok,err)=>{const k=++id;pend.set(k,{ok,err});w.postMessage({...msg,id:k})});
  call({type:'init',base:new URL('./',location.href).href}).then(()=>res(texts=>call({type:'embed',texts})),rej)})}
async function mainThreadClip(){
  const T=await import('./vendor/transformers.min.js');
  T.env.allowRemoteModels=false;T.env.allowLocalModels=true;T.env.localModelPath=new URL('models/',location.href).href;
  T.env.backends.onnx.wasm.wasmPaths=new URL('vendor/',location.href).href;T.env.backends.onnx.wasm.numThreads=1;
  const id='Xenova/clip-vit-base-patch16';
  const [tok,model]=await Promise.all([T.AutoTokenizer.from_pretrained(id),T.CLIPTextModelWithProjection.from_pretrained(id,{dtype:'q8',device:'wasm'})]);
  const f=async(texts)=>{const inp=tok(texts,{padding:true,truncation:true});const {text_embeds}=await model(inp);
    const d=text_embeds.dims[1],data=text_embeds.data,res=[];for(let k=0;k<texts.length;k++){const v=data.slice(k*d,(k+1)*d);let n=0;for(const x of v)n+=x*x;n=Math.sqrt(n);res.push(v.map(x=>x/n))}return res};
  await f(['warmup']);return f}
async function initClip(){
  if(clip||clipState==='loading'||clipState==='failed')return;
  setAI('loading','loading AI search…');
  try{
    let f;try{f=await workerClip()}catch(e){console.warn('worker CLIP unavailable, main thread',e);f=await mainThreadClip()}
    await loadEmb();clip=f;setAI('ready','AI vibe search on');if(state.q)update();
  }catch(e){console.warn('CLIP failed',e);setAI('failed','keyword search');}
}
const cache=new Map();
async function clipScores(q,prompt){
  const key=q+'|'+prompt;if(cache.has(key))return cache.get(key);
  const texts=[`a photo of ${PERSON.name} `+q,q];if(prompt)texts.push(prompt);
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
const grid=$('#grid');let cols=2,colW=0;const GAP=8;const nodes=new Map();let POS=[],gridTop=0;
// Virtualized masonry: positions are computed for every result (cheap math), but only cards near the viewport are in the DOM.
function layout(){
  const W=grid.clientWidth;cols=Math.max(2,Math.min(7,Math.floor(W/210)));colW=(W-GAP*(cols-1))/cols;
  const h=new Array(cols).fill(0);POS=new Array(state.order.length);
  state.order.forEach((it,r)=>{let c=0;for(let k=1;k<cols;k++)if(h[k]<h[c]-1)c=k;
    const hh=colW*it.th/it.tw;POS[r]=[c*(colW+GAP),h[c],colW,hh];h[c]+=hh+GAP});
  grid.style.height=Math.max(0,...h)+'px';gridTop=grid.getBoundingClientRect().top+scrollY;mount(true)}
function mount(force){
  const y0=scrollY-gridTop-innerHeight*1.2,y1=scrollY-gridTop+innerHeight*2.2,q=!!state.q.trim();const want=new Set();
  for(let r=0;r<state.order.length;r++){const p=POS[r];if(!p||p[1]+p[3]<y0||p[1]>y1)continue;const it=state.order[r];want.add(it.id);
    let n=nodes.get(it.id);const fresh=!n;if(fresh){n=card(it);nodes.set(it.id,n)}
    if(fresh||force||n._r!==r){n._r=r;const st=n.style;st.width=p[2]+'px';st.height=p[3]+'px';st.transform=`translate3d(${p[0]}px,${p[1]}px,0)`;
      n.classList.toggle('best',q&&r<3);n._fav.classList.toggle('on',favs.has(it.id))}
    if(fresh)grid.appendChild(n)}
  for(const [id,n] of nodes)if(!want.has(id)){n.remove();nodes.delete(id);if(POOL.length<80)POOL.push(n)}}
let mq=0;addEventListener('scroll',()=>{if(!mq)mq=requestAnimationFrame(()=>{mq=0;mount(false)})},{passive:true});
const byId=new Map();
const TPL=document.createElement('div');TPL.className='card';TPL.tabIndex=0;
TPL.innerHTML=`<img decoding="async" alt=""><div class="ov"><span class="tg"></span><span class="qa"><button class="cp" title="Copy">📋</button><button class="dl" title="Download">⬇</button><button class="bh" title="Bottom-half 1080×960 (face-centered)">▤</button><button class="fav" title="Save">♥</button></span></div>`;
const POOL=[];
function onImg(e){const im=e.target,it=byId.get(im.parentNode&&im.parentNode.dataset.id);if(it&&im.getAttribute('src')===it.thumb){it._ld=1;im.classList.add('ld')}}
function card(it){   // recycled node from POOL when possible (no DOM parsing while scrolling)
  let d=POOL.pop();if(!d){d=TPL.cloneNode(true);d._img=d.firstChild;d._tg=d.querySelector('.tg');d._fav=d.querySelector('.fav');d._img.addEventListener('load',onImg)}
  d.dataset.id=it.id;d._r=-1;const img=d._img;img.classList.toggle('ld',!!it._ld);img.src=it.thumb;img.alt=it.desc;
  d._tg.textContent=it._tg||(it._tg=it.emos.slice(0,2).map(e=>META.cats.emotion[e]).join(' · '));
  return d}
grid.addEventListener('click',e=>{const d=e.target.closest('.card');if(!d)return;const it=byId.get(d.dataset.id);if(!it)return;const b=e.target.closest('button');
  if(b?.classList.contains('fav')){e.stopPropagation();toggleFav(it);return}
  if(b?.classList.contains('dl')){e.stopPropagation();download(it);return}
  if(b?.classList.contains('bh')){e.stopPropagation();bottomHalf(it);return}
  if(b?.classList.contains('cp')){e.stopPropagation();copyImg(it);return}
  openLB(state.order.indexOf(it))});
grid.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const d=e.target.closest('.card');const it=d&&byId.get(d.dataset.id);if(it)openLB(state.order.indexOf(it))});
function render(){
  if(!byId.size)state.items.forEach(it=>byId.set(it.id,it));
  layout();
  $('#empty').hidden=state.order.length>0;
  const tot=state.items.length;$('#count').textContent=(state.q||activeCount()||state.favOnly)?`${state.order.length} of ${tot} images`+(state.q?' · best matches first':''):`${tot} images`;
}
addEventListener('resize',()=>{clearTimeout(layout.t);layout.t=setTimeout(layout,120)});

// ---------- filters UI ----------
const GROUPS=[['emotion','Emotion'],['setting','Setting'],['who',"Who's in it"],['clothing','Wearing / style'],['shot','Shot type']];
function counts(g){const c={};for(const it of state.items){const vals=g==='clothing'?it.clothing:g==='emotion'?it.emos:[it[g]];for(const v of vals)c[v]=(c[v]||0)+1}return c}
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
const QUICK=['shocked','confused','disbelief','laughing','smug','disgusted','awkward','hype','smiling','suspicious'];
function renderChips(){
  const c=$('#chips');c.innerHTML='';
  for(const [g,s] of Object.entries(state.f))for(const k of s)if(!(g==='emotion'&&QUICK.includes(k))){const b=document.createElement('button');b.className='chip x';b.textContent=META.cats[g][k]+'  ✕';b.onclick=()=>toggleF(g,k);c.appendChild(b)}
  for(const k of QUICK){if(!META.cats.emotion[k])continue;const b=document.createElement('button');b.className='chip'+(state.f.emotion.has(k)?' on':'');b.textContent=META.cats.emotion[k];b.onclick=()=>toggleF('emotion',k);c.appendChild(b)}
  const sc=counts('setting');for(const k of Object.keys(sc).filter(k=>META.cats.setting[k]&&sc[k]>=3).sort((a,b)=>sc[b]-sc[a]).slice(0,8)){const b=document.createElement('button');b.className='chip'+(state.f.setting.has(k)?' on':'');b.textContent=META.cats.setting[k];b.onclick=()=>toggleF('setting',k);c.appendChild(b)}
}
const panel=$('#panel'),scrim=$('#scrim');
const openP=o=>{panel.classList.toggle('open',o);scrim.classList.toggle('on',o);panel.setAttribute('aria-hidden',!o)};
$('#filterbtn').onclick=()=>openP(true);$('#closep').onclick=()=>openP(false);scrim.onclick=()=>openP(false);
$('#resetf').onclick=()=>{Object.values(state.f).forEach(s=>s.clear());syncF();update()};
$('#favbtn').onclick=()=>{state.favOnly=!state.favOnly;$('#favbtn').setAttribute('aria-pressed',state.favOnly);if(state.favOnly&&!favs.size)toast('No saved images yet — tap ♥ on any image');update()};

// ---------- search box ----------
const qi=$('#q');let deb;
qi.addEventListener('input',()=>{state.q=qi.value;$('#clearq').style.display=qi.value?'block':'none';initClip();clearTimeout(deb);deb=setTimeout(update,220)});
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
  const tg=[...it.emos.map(e=>['emotion',e]),['setting',it.setting],['who',it.who],['shot',it.shot],...it.clothing.map(c=>['clothing',c])];
  $('#lbtags').innerHTML='';tg.forEach(([g,k])=>{const s=document.createElement('span');s.textContent=C[g][k];s.title='Filter by '+C[g][k];s.onclick=()=>{closeLB();if(!state.f[g].has(k))toggleF(g,k)};$('#lbtags').appendChild(s)});
  if(it.celeb){const s=document.createElement('span');s.textContent=it.celeb;$('#lbtags').appendChild(s)}
  $('#lbdl').href=it.full;$('#lbdl').setAttribute('download',fname(it));
  $('#lbmeta').textContent=`${it.w}×${it.h}px`+(it.enh?' · AI-enhanced':'')+(it.added?' · added '+it.added:'');lbFavUI()}
function lbFavUI(){const it=state.order[state.lbIndex];if(!it)return;const on=favs.has(it.id);const b=$('#lbfav');b.classList.toggle('on',on);b.textContent=on?'♥ Saved':'♡ Save'}
function closeLB(){lb.hidden=true;state.lbIndex=-1;document.body.style.overflow='';lbimg.removeAttribute('src')}
$('#lbclose').onclick=closeLB;$('#lbprev').onclick=()=>openLB(Math.max(0,state.lbIndex-1));$('#lbnext').onclick=()=>openLB(Math.min(state.order.length-1,state.lbIndex+1));
$('#lbdl').onclick=e=>{e.preventDefault();download(state.order[state.lbIndex])};
$('#lbcopy').onclick=()=>copyImg(state.order[state.lbIndex]);$('#lbbh').onclick=()=>bottomHalf(state.order[state.lbIndex]);$('#lbfav').onclick=()=>toggleFav(state.order[state.lbIndex]);
lb.addEventListener('click',e=>{if(e.target===lb||e.target.classList.contains('lbimgwrap'))closeLB()});
addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')closeLB();if(e.key==='ArrowRight')$('#lbnext').click();if(e.key==='ArrowLeft')$('#lbprev').click()});
let tx=null;lb.addEventListener('touchstart',e=>{tx=e.touches[0].clientX},{passive:true});
lb.addEventListener('touchend',e=>{if(tx==null)return;const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>60)(dx<0?$('#lbnext'):$('#lbprev')).click();tx=null});

saveFavs();setAI('idle','tap search for AI vibe search');
load().then(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{})}).catch(e=>{console.error(e);$('#count').textContent='Failed to load library'});

// ---------- bottom-half ready download: 1080x960 (bottom of a 1080x1920 split), face-centered chest-up, light sharpen, all client-side ----------
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>res(im);im.onerror=rej;im.src=src})}
function bhRect(it,W,H){
  const AR=1080/960;let f=it.face;// normalized [x,y,w,h]
  if(!f)f=[0.38,0.15,0.24,0.24];
  const fx=f[0]*W,fy=f[1]*H,fw=f[2]*W,fh=f[3]*H;
  let h=Math.max(fh*3.3,H*0.55,960*0.62);let w=h*AR;
  if(w>W){w=W;h=w/AR}if(h>H){h=H;w=h*AR;if(w>W){w=W;h=w/AR}}
  let x=fx+fw/2-w/2,y=fy-h*0.16;
  x=Math.max(0,Math.min(W-w,x));y=Math.max(0,Math.min(H-h,y));
  return [x,y,w,h]}
function sharpen(ctx,W,H,amt){const d=ctx.getImageData(0,0,W,H),s=d.data,o=new Uint8ClampedArray(s);
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=(y*W+x)*4;
    for(let c=0;c<3;c++){const v=s[i+c],b=(s[i-4+c]+s[i+4+c]+s[i-W*4+c]+s[i+W*4+c])/4;o[i+c]=v+(v-b)*amt}}
  d.data.set(o);ctx.putImageData(d,0,0)}
async function bottomHalf(it){
  try{toast('Making bottom-half 1080×960…');const im=await loadImg(it.full);const W=im.naturalWidth,H=im.naturalHeight;
    const [x,y,w,h]=bhRect(it,W,H);const c=document.createElement('canvas');c.width=1080;c.height=960;const ctx=c.getContext('2d');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(im,x,y,w,h,0,0,1080,960);
    sharpen(ctx,1080,960,w<1080?0.55:0.3);
    const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.95));const u=URL.createObjectURL(b);const a=document.createElement('a');
    a.href=u;a.download=fname(it).replace(/\.jpg$/i,'')+'-bottom-1080x960.jpg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Bottom-half ready ✓')}
  catch(e){console.warn(e);toast('Could not make bottom-half here')}}

// ---------- caption → image match ----------
const cap=$('#cap'),capT=$('#capt');
$('#capbtn').onclick=()=>{cap.hidden=false;setTimeout(()=>capT.focus(),50);initClip()};
$('#capclose').onclick=()=>{cap.hidden=true};
cap.addEventListener('click',e=>{if(e.target===cap)cap.hidden=true});
$('#capgo').onclick=async()=>{const t=capT.value.trim();if(!t){toast('Paste a caption or clip quote first');return}
  cap.hidden=true;state.capMode=true;qi.value=t;state.q=t;$('#clearq').style.display='block';
  if(!clip&&clipState==='loading')toast('AI loading — ranking with keywords for now');
  await update();scrollTo({top:0,behavior:'smooth'});toast(`Best ${PERSON.name} images for that caption`)};
capT.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))$('#capgo').click()});
// switcher menu
$('#brand').onclick=e=>{e.stopPropagation();$('#pmenu').classList.toggle('open')};
addEventListener('click',()=>$('#pmenu').classList.remove('open'));
