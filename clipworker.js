// CLIP text encoder in a Web Worker so model download/compile/inference never blocks scrolling or typing.
import * as T from './vendor/transformers.min.js';
let tok=null,model=null;
async function embed(texts){const inp=tok(texts,{padding:true,truncation:true});const {text_embeds}=await model(inp);
  const d=text_embeds.dims[1],data=text_embeds.data,res=[];
  for(let k=0;k<texts.length;k++){const v=Float32Array.from(data.subarray(k*d,(k+1)*d));let n=0;for(const x of v)n+=x*x;n=Math.sqrt(n)||1;for(let j=0;j<d;j++)v[j]/=n;res.push(v)}return res}
self.onmessage=async e=>{const {id,type,texts,base}=e.data;
  try{
    if(type==='init'){
      T.env.allowRemoteModels=false;T.env.allowLocalModels=true;T.env.localModelPath=base+'models/';
      T.env.backends.onnx.wasm.wasmPaths=base+'vendor/';T.env.backends.onnx.wasm.numThreads=1;
      const mid='Xenova/clip-vit-base-patch16';
      [tok,model]=await Promise.all([T.AutoTokenizer.from_pretrained(mid),T.CLIPTextModelWithProjection.from_pretrained(mid,{dtype:'q8',device:'wasm'})]);
      await embed(['warmup']);postMessage({id,ok:true});
    }else postMessage({id,ok:true,res:await embed(texts)});
  }catch(err){postMessage({id,ok:false,err:String(err&&err.message||err)})}};
