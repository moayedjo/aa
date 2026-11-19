"use strict";
let W=1080,H=1920;
const FONTS=["Tajawal","Amiri","Aref Ruqaa","Reem Kufi"];
const COLORS=["#3F2E5C","#222222","#D94F70","#8A6A3B","#1F5A5A","#FFFFFF"];
/* تعريف القالب الأصلي — مفصول عن مشروع العميل */
const TEMPLATES={
 static:{id:"demo-static-1",name:"قالب تجريبي ثابت — دعوة",kind:"static",w:W,h:H,elements:[
  {id:"kicker",type:"text",label:"السطر الافتتاحي",text:"بكل الحب ندعوكم",font:"Tajawal",weight:400,size:52,color:"#8A6A3B",align:"center",x:540,y:330,box:{w:820,h:100},required:false},
  {id:"photo",type:"image",label:"الصورة",frame:{x:540,y:640,w:380,h:380,round:true},movable:true,resizable:true,required:false},
  {id:"title",type:"text",label:"العنوان",text:"حفل خطوبتنا",font:"Aref Ruqaa",weight:400,size:170,color:"#3F2E5C",align:"center",x:540,y:1010,box:{w:900,h:280},required:true},
  {id:"names",type:"text",label:"الأسماء",text:"سارة  و  أحمد",font:"Amiri",weight:400,size:96,color:"#D94F70",align:"center",x:540,y:1250,box:{w:880,h:170},required:true},
  {id:"details",type:"text",label:"التفاصيل",text:"الجمعة ٢٥ يناير · الساعة السابعة مساءً\nقاعة الاحتفالات",font:"Tajawal",weight:400,size:50,color:"#222222",align:"center",x:540,y:1500,box:{w:860,h:220},required:false}
 ]},
 video:{id:"demo-video-1",name:"قالب تجريبي متحرك — تهنئة",kind:"video",w:W,h:H,refT:3.2,newText:{in:.6,out:99},elements:[
  {id:"title",type:"text",label:"العنوان",text:"عيدكم مبارك",font:"Aref Ruqaa",weight:400,size:190,color:"#3F2E5C",align:"center",x:540,y:820,box:{w:920,h:320},required:true,in:.3,out:99},
  {id:"sub",type:"text",label:"السطر الثاني",text:"كل عام وأنتم بخير",font:"Tajawal",weight:400,size:66,color:"#D94F70",align:"center",x:540,y:1090,box:{w:860,h:140},required:true,in:1.0,out:99},
  {id:"from",type:"text",label:"المرسل",text:"مع تحيات عائلة النعيمي",font:"Amiri",weight:400,size:58,color:"#222222",align:"center",x:540,y:1560,box:{w:820,h:120},required:false,in:1.7,out:99}
 ]}
};
/* ربط المنتج: كل منتج تجريبي يفتح نسخة من القالب التجريبي بنصوصه وعناصره */
const P=new URLSearchParams(location.search), SLUG=P.get("p")||"";
/* قالب من أداة الإعداد: يُقرأ من هذا المتصفح (localStorage + IndexedDB) */
const TPLID=P.get("tpl")||"",ADMIN=P.get("admin")==="1";let CUSTOM=null,bgImg=null;
const fget=k=>new Promise(r=>{try{const q=indexedDB.open("namq",1);q.onupgradeneeded=()=>q.result.createObjectStore("f");q.onerror=()=>r(null);
  q.onsuccess=()=>{const g=q.result.transaction("f").objectStore("f").get(k);g.onsuccess=()=>r(g.result||null);g.onerror=()=>r(null)}}catch(e){r(null)}});
async function loadCustom(){if(!TPLID)return;try{const t=JSON.parse(localStorage.getItem("namq-tpls")||"[]").find(x=>x.id===TPLID);if(!t)return;
  CUSTOM=JSON.parse(JSON.stringify(t));CUSTOM.id=t.id+"@"+(t.v||0);W=t.w;H=t.h;
  for(const f of t.customFonts||[]){const b=await fget("font:"+f);if(b){const ff=new FontFace(f,await b.arrayBuffer());await ff.load();document.fonts.add(ff)}}
  if(t.fonts&&t.fonts.length){FONTS.length=0;FONTS.push(...t.fonts)}
  const b=await fget("bg:"+t.id);if(b){const u=URL.createObjectURL(b);
    if(t.kind==="video"){vid.src=u;await new Promise(r=>{vid.onloadeddata=r;vid.onerror=r;setTimeout(r,4000)})}
    else{bgImg=new Image();await new Promise(r=>{bgImg.onload=r;bgImg.onerror=()=>{bgImg=null;r()};bgImg.src=u})}}
  const wr=document.querySelector(".stage .wrap");wr.style.aspectRatio=W+"/"+H;wr.style.height="auto";wr.style.minHeight="0";wr.style.width="min(100%,"+(44*W/H).toFixed(1)+"vh)";$("seg").hidden=true}catch(e){}}
/* قالب منشور من مجموعة «قوالب نمق» في Wix CMS: يُقرأ حسب المنتج */
const wixMedia=u=>{if(!u)return"";if(typeof u==="object")u=u.url||u.src||"";if(/^https?:/.test(u))return u;
  const m=/^wix:(image|video):\/\/v1\/([^/#]+)/.exec(u);if(!m)return"";return m[1]==="image"?"https://static.wixstatic.com/media/"+m[2]:"https://video.wixstatic.com/video/"+m[2]+"/file"};
async function loadRemote(){if(TPLID||!SLUG||CUSTOM)return;try{const{wixRequest}=await import("/js/wix/client.js");
  const r=await wixRequest("/wix-data/v2/items/query",{method:"POST",body:{dataCollectionId:"NamqTemplates",query:{filter:{productSlug:SLUG,published:true},paging:{limit:1}}}});
  const it=(r.dataItems||[])[0];if(!it)return;const d=it.data||{},t=JSON.parse(d.definition||"{}");if(!t.elements)return;
  CUSTOM=t;CUSTOM.id="cms-"+it.id+"@"+(d._updatedDate&&d._updatedDate.$date||d._updatedDate||"");W=t.w||1080;H=t.h||1920;
  if(t.fonts&&t.fonts.length){FONTS.length=0;FONTS.push(...t.fonts)}
  const src=wixMedia(t.kind==="video"?d.backgroundVideo:d.background)||t.bgUrl||"";
  if(src){if(t.kind==="video"){vid.crossOrigin="anonymous";vid.src=src;await new Promise(r=>{vid.onloadeddata=r;vid.onerror=r;setTimeout(r,6000)})}
    else{bgImg=new Image();bgImg.crossOrigin="anonymous";await new Promise(r=>{bgImg.onload=r;bgImg.onerror=()=>{bgImg=null;r()};bgImg.src=src})}}
  const wr=document.querySelector(".stage .wrap");wr.style.aspectRatio=W+"/"+H;wr.style.height="auto";wr.style.minHeight="0";wr.style.width="min(100%,"+(44*W/H).toFixed(1)+"vh)";$("seg").hidden=true}catch(e){CUSTOM=null}}
const VARIANTS=[
 {k:"خطوبة",texts:{},mono:true},
 {k:"مولود",texts:{kicker:"رزقنا الله بمولودنا",title:"أهلًا يوسف",names:"عائلة النعيمي",details:"وُلد يوم الجمعة ٢٥ يناير\nشاكرين دعواتكم"}},
 {k:"تخرج",texts:{kicker:"مبارك التخرج",title:"ألف مبروك",names:"المهندسة سارة",details:"دفعة ٢٠٢٦\nبكل الفخر والاعتزاز"}},
 {k:"عرض",texts:{kicker:"لفترة محدودة",title:"عرض خاص",names:"خصم ٣٠٪",details:"على جميع المنتجات حتى نهاية الشهر\nاطلب الآن"},logo:true}
];
const VAR=VARIANTS.find(v=>SLUG.includes(v.k))||{k:"",texts:{}};
const LETTERS="ابتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");
const MONO_FONTS=["Aref Ruqaa","Amiri","Reem Kufi"];
function tplFor(m){if(CUSTOM)return JSON.parse(JSON.stringify(CUSTOM));const t=JSON.parse(JSON.stringify(TEMPLATES[m]));if(m!=="static")return t;
  for(const e of t.elements)if(VAR.texts[e.id])e.text=VAR.texts[e.id];
  if(VAR.mono){t.elements.find(e=>e.id==="photo").startHidden=true;
    t.elements.splice(1,0,{id:"mono",type:"mono",label:"رمز العروسين",a:"س",b:"أ",font:"Aref Ruqaa",size:300,color:"#C9A86A",gap:22,rise:16,x:540,y:640,required:false})}
  if(VAR.logo)t.elements.push({id:"logo",type:"image",kind:"logo",label:"الشعار",frame:{x:540,y:1740,w:300,h:160},movable:true,resizable:true,required:false});
  if(VAR.k)t.id+="-v"+VARIANTS.indexOf(VAR);return t}
let T=null;const DKEY=()=>"namq-draft-"+(TPLID?"tpl-"+TPLID:SLUG||mode);
let mode="static", S=null, sel=null, guides={v:false,h:false}, hist=[], imgs={}, playing=false;
const $=id=>document.getElementById(id), pv=$("pv"), ctx=pv.getContext("2d"), vid=$("vid");
const clone=o=>JSON.parse(JSON.stringify(o));
function newProject(m){const t=T;return{templateId:t.id,kind:t.kind,elements:t.elements.map(e=>({...clone(e),hidden:!!e.startHidden,base:clone(e)})),n:0}}
function tpl(){return T}
function el(id){return S.elements.find(e=>e.id===id)}
function snap(){hist.push(JSON.stringify(S));if(hist.length>60)hist.shift();$("undo").disabled=false}
function save(){if(ADMIN)return;try{S.slug=SLUG;localStorage.setItem(DKEY(),JSON.stringify(S))}catch(e){}}

/* ---------- الرسم: نفس الدالة للمعاينة والتصدير ---------- */
function bg(c){if(bgImg){c.drawImage(bgImg,0,0,W,H);return}
  // خلفية تجريبية مولّدة بالكود (تمثّل الصورة التي يرفعها المصمم)
  const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,"#FBF4EE");g.addColorStop(1,"#F3E9F4");c.fillStyle=g;c.fillRect(0,0,W,H);
  c.save();c.globalAlpha=.55;
  [[-80,-60,420,"#EBD9F1"],[W+60,250,300,"#FBDDE5"],[-40,H-120,360,"#FBDDE5"],[W+40,H+20,460,"#E3D3EE"]].forEach(([x,y,r,col])=>{c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=col;c.fill()});
  c.globalAlpha=.9;c.strokeStyle="#C9A86A";c.lineWidth=3;
  [[-80,-60,470],[W+40,H+20,510]].forEach(([x,y,r])=>{c.beginPath();c.arc(x,y,r,0,7);c.stroke()});
  c.restore();c.strokeStyle="#E3D8CC";c.lineWidth=2;c.strokeRect(54,54,W-108,H-108);
}
function wrap(c,text,maxW){const out=[];for(const para of String(text).split("\n")){const words=para.split(/\s+/).filter(Boolean);let line="";
  for(const w of words){const t=line?line+" "+w:w;if(line&&c.measureText(t).width>maxW){out.push(line);line=w}else line=t}out.push(line)}return out}
function layout(c,e){let size=e.size;const min=Math.max(18,Math.round(e.base.size*.45));
  for(;;){c.font=`${e.weight||400} ${size}px "${e.font}"`;const lines=wrap(c,e.text,e.box.w),lh=size*1.4,h=lines.length*lh;
    const wide=lines.some(l=>c.measureText(l).width>e.box.w+1);
    if((h<=e.box.h&&!wide)||size<=min)return{lines,size,lh,h,overflow:h>e.box.h||wide};size=Math.max(min,size-2)}}
function anim(e,t){if(t==null||e.in==null)return{a:1,dy:0};const a=Math.max(0,Math.min(1,(t-e.in)/.6))*Math.max(0,Math.min(1,(e.out-t)/.4));const k=1-Math.pow(1-Math.min(1,Math.max(0,(t-e.in)/.6)),3);return{a,dy:(1-k)*46}}
function drawText(c,e,t){const L=layout(c,e),A=anim(e,t);e._overflow=L.overflow;if(A.a<=0||!e.text.trim())return;
  c.save();c.globalAlpha=A.a;c.fillStyle=e.color;c.direction="rtl";c.textBaseline="middle";c.textAlign=e.align;
  c.font=`${e.weight||400} ${L.size}px "${e.font}"`;
  const ax=e.align==="center"?e.x:e.align==="right"?e.x+e.box.w/2:e.x-e.box.w/2;let y=e.y-L.h/2+L.lh/2+A.dy;
  for(const l of L.lines){c.fillText(l,ax,y);y+=L.lh}c.restore()}
function framePath(c,f){const x=f.x-f.w/2,y=f.y-f.h/2;c.beginPath();if(f.round)c.ellipse(f.x,f.y,f.w/2,f.h/2,0,0,7);else c.roundRect(x,y,f.w,f.h,24)}
function clampImg(e,im){const f=e.frame,s=Math.max(f.w/im.width,f.h/im.height)*(e.zoom||1),mx=(im.width*s-f.w)/2,my=(im.height*s-f.h)/2;
  e.ox=Math.max(-mx,Math.min(mx,e.ox||0));e.oy=Math.max(-my,Math.min(my,e.oy||0));return s}
function drawImage(c,e,forExport){const f=e.frame,im=imgs[e.id];
  if(!im){if(forExport)return;c.save();framePath(c,f);c.fillStyle="rgba(255,255,255,.7)";c.fill();c.setLineDash([14,10]);c.strokeStyle="#C9A86A";c.lineWidth=3;c.stroke();
    c.fillStyle="#8A6A3B";c.font='400 40px "Tajawal"';c.textAlign="center";c.textBaseline="middle";c.direction="rtl";c.fillText(e.kind==="logo"?"أضف شعارًا":"أضف صورة",f.x,f.y);c.restore();return}
  if(e.kind==="logo"){const s=Math.min(f.w/im.width,f.h/im.height);c.drawImage(im,f.x-im.width*s/2,f.y-im.height*s/2,im.width*s,im.height*s);return}
  const s=clampImg(e,im);c.save();framePath(c,f);c.clip();c.drawImage(im,f.x-im.width*s/2+e.ox,f.y-im.height*s/2+e.oy,im.width*s,im.height*s);c.restore();
  c.save();framePath(c,f);c.strokeStyle="#fff";c.lineWidth=8;c.stroke();c.restore()}
function bounds(e){return e.type==="image"?e.frame:e.type==="mono"?{x:e.x,y:e.y,w:e.size*1.7,h:e.size*1.4}:{x:e.x,y:e.y,w:e.box.w,h:e.box.h}}
function drawMono(c,e){c.save();c.fillStyle=e.color;c.textAlign="center";c.textBaseline="middle";c.direction="rtl";c.font=`400 ${e.size}px "${e.font}"`;
  const d=e.size*e.gap/100,r=e.size*e.rise/200;c.fillText(e.a,e.x+d,e.y-r);c.globalAlpha=.82;c.fillText(e.b,e.x-d,e.y+r);c.restore()}
function drawScene(c,opt){opt=opt||{};const t=opt.t;
  if(!opt.textOnly){if(mode==="video"&&vid.readyState>=2)c.drawImage(vid,0,0,W,H);else bg(c)}
  for(const e of S.elements){if(e.hidden)continue;if(e.type==="image"){if(!opt.textOnly)drawImage(c,e,opt.exp)}else if(e.type==="mono")drawMono(c,e);else drawText(c,e,t)}
  if(!opt.exp&&!opt.textOnly){
    if(sel){const e=el(sel);if(e&&!e.hidden){const b=bounds(e);
      c.save();c.setLineDash([12,8]);c.strokeStyle="#D94F70";c.lineWidth=3;c.strokeRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);c.restore()}}
    c.save();c.strokeStyle="#D94F70";c.lineWidth=2;
    if(guides.v){c.beginPath();c.moveTo(W/2,0);c.lineTo(W/2,H);c.stroke()}
    if(guides.h){c.beginPath();c.moveTo(0,H/2);c.lineTo(W,H/2);c.stroke()}c.restore()}
}
function paint(){if(!S)return;const r=pv.getBoundingClientRect(),d=Math.min(2.5,window.devicePixelRatio||1),w=Math.max(2,Math.round(r.width*d)),h=Math.round(w*H/W);
  if(pv.width!==w||pv.height!==h){pv.width=w;pv.height=h}ctx.setTransform(w/W,0,0,w/W,0,0);ctx.clearRect(0,0,W,H);
  drawScene(ctx,{t:mode==="video"?(playing?vid.currentTime:tpl().refT):null});syncWarn()}
function loop(){if(playing){paint();requestAnimationFrame(loop)}}

/* ---------- الحقول ---------- */
function syncWarn(){for(const e of S.elements){const w=document.querySelector(`[data-warn="${e.id}"]`);if(w)w.classList.toggle("on",!!e._overflow&&!e.hidden)}}
function monoUI(e){const sel=(k,n)=>`<label class="lbl">${n} <select data-act="mset" data-k="${k}" data-id="${e.id}" ${e.hidden?"disabled":""}>${LETTERS.map(l=>`<option ${e[k]===l?"selected":""}>${l}</option>`).join("")}</select></label>`;
  const rng=(k,n,a,b)=>`<div class="lbl" style="margin-top:8px">${n}</div><input type="range" data-act="mnum" data-k="${k}" data-id="${e.id}" min="${a}" max="${b}" value="${e[k]}">`;
  return `<div class="row" style="margin-top:8px;justify-content:flex-start;gap:16px">${sel("a","حرف العريس")}${sel("b","حرف العروس")}</div>
  <div class="lbl" style="margin-top:8px">الخط</div><div class="chips">${MONO_FONTS.map(f=>`<button class="chip" style="font-family:'${f}'" data-act="font" data-id="${e.id}" data-v="${f}" aria-pressed="${e.font===f}">${e.a} ${e.b}</button>`).join("")}</div>
  <div class="lbl">اللون</div><div class="chips">${COLORS.concat("#C9A86A").map(k=>`<button class="sw" style="background:${k}" data-act="color" data-id="${e.id}" data-v="${k}" aria-pressed="${e.color===k}" aria-label="لون ${k}"></button>`).join("")}</div>
  ${rng("size","الحجم",150,450)}${rng("gap","التقارب",0,45)}${rng("rise","الارتفاع",-40,40)}
  <div class="row" style="margin-top:10px"><button class="btn" data-act="reset" data-id="${e.id}">استعادة الوضع الأصلي</button><span class="lbl">اسحب الرمز في المعاينة لتحريكه</span></div>
  <p class="note">الحرفان يُرسمان بالخط المختار كما هو. اضبط التقارب والارتفاع حتى يعجبك التداخل.</p>`}
function frameUI(e,has){let h="";if(e.hidden)return h;
  if(e.movable&&has&&e.kind!=="logo")h+=`<div class="lbl" style="margin-top:8px">السحب في المعاينة يحرّك</div><div class="chips">${[["0","الصورة داخل الإطار"],["1","الإطار نفسه"]].map(([v,n])=>`<button class="chip" style="font-size:14px" data-act="fmode" data-id="${e.id}" data-v="${v}" aria-pressed="${(!!e.dragFrame)===(v==="1")}">${n}</button>`).join("")}</div>`;
  if(e.resizable)h+=`<div class="lbl" style="margin-top:8px">حجم ${e.kind==="logo"?"الشعار":"الإطار"}</div><input type="range" data-act="fsize" data-id="${e.id}" min="50" max="160" value="${Math.round((e.fs||1)*100)}">`;
  if(e.movable||e.resizable)h+=`<div style="margin-top:8px"><button class="btn" data-act="reset" data-id="${e.id}">إرجاع المكان والحجم</button></div>`;
  return h}
function build(){const F=$("fields");F.innerHTML="";
  for(const e of S.elements){const d=document.createElement("div");d.className="card"+(sel===e.id?" sel":"");d.dataset.card=e.id;
    const optional=!e.required;
    let h=`<div class="row"><label class="t" for="f-${e.id}">${e.label} ${optional?'<span class="opt">(اختياري)</span>':""}</label><div class="row">`;
    if(optional&&!e.added)h+=`<button class="btn" data-act="hide" data-id="${e.id}">${e.hidden?"إظهار":"إخفاء"}</button>`;
    if(e.added)h+=`<button class="btn" data-act="del" data-id="${e.id}">حذف</button>`;
    h+=`</div></div>`;
    if(e.type==="text"){
      h+=`<textarea id="f-${e.id}" data-id="${e.id}" rows="${e.text.includes("\n")?2:1}" ${e.hidden?"disabled":""}></textarea>
      <div class="warn" data-warn="${e.id}">النص أطول من المساحة المخصصة له حتى بعد تصغيره. اختصر النص أو صغّر الخط من «تنسيق النص» — لن نقصّه تلقائيًا.</div>
      <div class="row" style="margin-top:8px"><button class="btn" data-act="fmt" data-id="${e.id}">تنسيق النص</button><span class="lbl">اسحب النص في المعاينة لتحريكه</span></div>
      <div class="fmt ${sel===e.id&&S.fmtOpen===e.id?"on":""}" id="fmt-${e.id}">
        <div class="lbl">الخط</div><div class="chips">${FONTS.map(f=>`<button class="chip" style="font-family:'${f}'" data-act="font" data-id="${e.id}" data-v="${f}" aria-pressed="${e.font===f}">نمق</button>`).join("")}</div>
        <div class="lbl">اللون</div><div class="chips">${COLORS.map(k=>`<button class="sw" style="background:${k}" data-act="color" data-id="${e.id}" data-v="${k}" aria-pressed="${e.color===k}" aria-label="لون ${k}"></button>`).join("")}<input type="color" data-act="colorIn" data-id="${e.id}" value="${e.color}" aria-label="لون مخصص" style="width:40px;height:32px;border:0;background:none;padding:0"></div>
        <div class="lbl">الحجم</div><input type="range" data-act="size" data-id="${e.id}" min="${Math.round(e.base.size*.5)}" max="${Math.round(e.base.size*1.5)}" value="${e.size}">
        <div class="lbl" style="margin-top:8px">المحاذاة</div><div class="chips">${[["right","يمين"],["center","وسط"],["left","يسار"]].map(([v,n])=>`<button class="chip" style="font-size:14px" data-act="align" data-id="${e.id}" data-v="${v}" aria-pressed="${e.align===v}">${n}</button>`).join("")}</div>
        <button class="btn" data-act="reset" data-id="${e.id}">إرجاع التنسيق الأصلي</button>
      </div>`;
    }else if(e.type==="mono"){h+=monoUI(e)}else{
      const has=!!imgs[e.id];
      h+=`<div class="bar" style="justify-content:flex-start"><label class="btn pri" style="display:inline-flex;align-items:center">${has?"استبدال الصورة":"رفع صورة من الجهاز"}<input type="file" accept="image/*" data-act="file" data-id="${e.id}" hidden></label>
      ${has?`<button class="btn" data-act="rmimg" data-id="${e.id}">حذف الصورة</button>`:""}</div>
      ${has&&e.kind!=="logo"?`<div class="lbl" style="margin-top:8px">تكبير داخل الإطار — واسحب الصورة في المعاينة لضبط القص</div><input type="range" data-act="zoom" data-id="${e.id}" min="100" max="300" value="${Math.round((e.zoom||1)*100)}">`:""}`;
      h+=frameUI(e,has);
    }
    d.innerHTML=h;F.appendChild(d);const ta=d.querySelector("textarea");if(ta)ta.value=e.text}
  const pb=$("prod");if(pb&&S.pname){pb.hidden=false}
  $("xMp4").hidden=mode!=="video";$("play").hidden=mode!=="video";$("addText").hidden=false;
  $("expNote").textContent="نسخة تجريبية: التصدير مفتوح مؤقتًا إلى حين تفعيل الدفع. "+(mode==="video"?"PNG وPDF يُصدَّران من المشهد المرجعي للقالب (الثانية "+tpl().refT+"). MP4 يُنتَج على خادم تصدير بنفس محرّك الرسم — غير مربوط داخل هذه الصفحة.":"المقاس النهائي "+W+"×"+H+" بكسل، مستقل عن حجم المعاينة. PDF هنا صورة نقطية RGB داخل صفحة بنفس المقاس — ليس ملف طباعة احترافيًا.");
}
function select(id,keep){sel=id;if(!keep)S.fmtOpen=S.fmtOpen===id?id:null;document.querySelectorAll("[data-card]").forEach(c=>c.classList.toggle("sel",c.dataset.card===id));paint()}
$("fields").addEventListener("input",ev=>{const t=ev.target,id=t.dataset.id;if(!id)return;const e=el(id),a=t.dataset.act;
  if(t.tagName==="TEXTAREA"){if(!t._s){snap();t._s=1}e.text=t.value;sel=id}
  else if(a==="size"){if(!t._s){snap();t._s=1}e.size=+t.value}
  else if(a==="zoom"){if(!t._s){snap();t._s=1}e.zoom=t.value/100}
  else if(a==="mnum"){if(!t._s){snap();t._s=1}e[t.dataset.k]=+t.value}
  else if(a==="fsize"){if(!t._s){snap();t._s=1}e.fs=t.value/100;e.frame.w=e.base.frame.w*e.fs;e.frame.h=e.base.frame.h*e.fs}
  else if(a==="colorIn"){if(!t._s){snap();t._s=1}e.color=t.value}
  paint();save()});
$("fields").addEventListener("change",ev=>{const t=ev.target;t._s=0;if(t.dataset.act==="mset"){snap();el(t.dataset.id)[t.dataset.k]=t.value;sel=t.dataset.id;build();paint();save();return}
  if(t.dataset.act==="file"&&t.files[0]){const id=t.dataset.id,rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{snap();imgs[id]=im;const e=el(id);e.zoom=1;e.ox=0;e.oy=0;e.hidden=false;sel=id;build();paint()};im.src=rd.result};rd.readAsDataURL(t.files[0])}});
$("fields").addEventListener("focusin",ev=>{const id=ev.target.dataset&&ev.target.dataset.id;if(id&&sel!==id)select(id,true)});
$("fields").addEventListener("click",ev=>{const b=ev.target.closest("[data-act]");if(!b||b.tagName==="INPUT"||b.tagName==="TEXTAREA"||b.tagName==="SELECT"||b.tagName==="OPTION")return;const id=b.dataset.id,e=el(id),a=b.dataset.act,v=b.dataset.v;
  if(a==="fmt"){sel=id;S.fmtOpen=S.fmtOpen===id?null:id;build();paint();return}
  snap();
  if(a==="font"){e.font=v;document.fonts.load(`${e.size}px "${v}"`,e.text||e.a+e.b).then(paint)}
  else if(a==="color")e.color=v;else if(a==="align")e.align=v;
  else if(a==="reset"){const b0=e.base;for(const k of ["font","size","color","align","x","y","gap","rise"])if(k in b0)e[k]=b0[k];if(b0.frame){e.frame=clone(b0.frame);e.fs=1}}
  else if(a==="fmode")e.dragFrame=v==="1";
  else if(a==="hide"){e.hidden=!e.hidden;if(e.hidden&&sel===id)sel=null}
  else if(a==="del"){S.elements=S.elements.filter(x=>x.id!==id);if(sel===id)sel=null}
  else if(a==="rmimg"){delete imgs[id];e.zoom=1;e.ox=e.oy=0}
  if(a!=="del"&&a!=="hide")sel=id;build();paint();save()});
$("addText").onclick=()=>{snap();S.n++;const t=tpl(),d=t.newText||{};const e={id:"added"+S.n,type:"text",label:"نص مضاف "+S.n,text:"نص جديد",font:"Tajawal",weight:400,size:60,color:"#222222",align:"center",x:W/2,y:Math.round(H*.9),box:{w:Math.round(W*.74),h:160},required:false,added:true,hidden:false};
  if(mode==="video"){e.in=d.in;e.out=d.out}e.base=clone(e);S.elements.push(e);sel=e.id;S.fmtOpen=null;build();paint();save();const ta=$("f-"+e.id);ta.scrollIntoView({block:"center",behavior:"smooth"});ta.focus();ta.select()};
$("undo").onclick=()=>{if(!hist.length)return;S=JSON.parse(hist.pop());$("undo").disabled=!hist.length;if(sel&&!el(sel))sel=null;build();paint();save()};
$("goExport").onclick=()=>$("exportCard").scrollIntoView({behavior:"smooth",block:"center"});

/* ---------- السحب في المعاينة ---------- */
function pt(ev){const r=pv.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height}}
function hit(p){for(let i=S.elements.length-1;i>=0;i--){const e=S.elements[i];if(e.hidden)continue;const b=e.type==="text"?{x:e.x,y:e.y,w:e.box.w,h:Math.min(e.box.h,Math.max(120,e.size*1.6))}:bounds(e);
  if(Math.abs(p.x-b.x)<=b.w/2&&Math.abs(p.y-b.y)<=b.h/2)return e}return null}
let drag=null;
pv.addEventListener("pointerdown",ev=>{const p=pt(ev),e=hit(p);if(!e){sel=null;select(null);return}pv.setPointerCapture(ev.pointerId);
  const fr=e.type==="image"&&(ADMIN||!!e.movable)&&(ADMIN||!!e.dragFrame||e.kind==="logo"||!imgs[e.id]);
  drag={id:e.id,p,fr,x0:fr?e.frame.x:e.type==="image"?(e.ox||0):e.x,y0:fr?e.frame.y:e.type==="image"?(e.oy||0):e.y,moved:false};if(sel!==e.id){select(e.id,true)}});
pv.addEventListener("pointermove",ev=>{if(!drag)return;const p=pt(ev),dx=p.x-drag.p.x,dy=p.y-drag.p.y,e=el(drag.id);
  if(!drag.moved){if(Math.hypot(dx,dy)<6)return;drag.moved=true;snap()}
  if(e.type==="image"&&!drag.fr){if(imgs[e.id]){e.ox=drag.x0+dx;e.oy=drag.y0+dy}}
  else{let x=drag.x0+dx,y=drag.y0+dy;guides.v=Math.abs(x-W/2)<16;guides.h=Math.abs(y-H/2)<16;if(guides.v)x=W/2;if(guides.h)y=H/2;
    const bw=bounds(e).w,o=drag.fr?e.frame:e;o.x=Math.max(bw/2-200,Math.min(W-bw/2+200,x));o.y=Math.max(60,Math.min(H-60,y))}
  paint()});
function endDrag(){if(drag){if(ADMIN&&drag.moved){const e=el(drag.id);parent.postMessage({namq:1,id:e.id,x:Math.round(e.x||0),y:Math.round(e.y||0),frame:e.frame||null},location.origin)}
  drag=null;guides.v=guides.h=false;paint();save()}}
pv.addEventListener("pointerup",endDrag);pv.addEventListener("pointercancel",endDrag);

/* ---------- التصدير ---------- */
function seek(t){return new Promise(r=>{if(vid.readyState<1)return r();const d=()=>{vid.removeEventListener("seeked",d);r()};vid.addEventListener("seeked",d);vid.currentTime=t;setTimeout(r,1500)})}
async function renderFull(opt){if(mode==="video"&&!opt.textOnly){playing=false;vid.pause();$("play").textContent="تشغيل";await seek(tpl().refT)}
  const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");drawScene(x,opt);return c}
function validate(){const m=S.elements.filter(e=>e.type==="text"&&e.required&&!e.text.trim());if(m.length)return"أكمل الحقل الإجباري: "+m.map(e=>e.label).join("، ");
  const o=S.elements.filter(e=>e.type==="text"&&!e.hidden&&e._overflow);if(o.length)return"النص في «"+o.map(e=>e.label).join("»، «")+"» أطول من مساحته. عدّله قبل التصدير.";return""}
const toBlob=(c,type,q)=>new Promise(r=>c.toBlob(r,type,q));
function pdfFromJpeg(jpg,wpx,hpx){const enc=new TextEncoder(),parts=[],offs=[];let len=0;const push=b=>{parts.push(b);len+=b.length},str=s=>push(enc.encode(s));
  const wp=(wpx*.75).toFixed(2),hp=(hpx*.75).toFixed(2),cs=`q ${wp} 0 0 ${hp} 0 0 cm /Im0 Do Q`;
  str("%PDF-1.4\n%âãÏÓ\n");const obj=(n,body)=>{offs[n]=len;str(`${n} 0 obj\n${body}\nendobj\n`)};
  obj(1,"<< /Type /Catalog /Pages 2 0 R >>");obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wp} ${hp}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
  obj(4,`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
  offs[5]=len;str(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${wpx} /Height ${hpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);push(jpg);str("\nendstream\nendobj\n");
  obj(6,"<< /Title (Namq demo export) /Producer (Namq prototype) >>");
  const xr=len;str("xref\n0 7\n0000000000 65535 f \n");for(let i=1;i<=6;i++)str(String(offs[i]).padStart(10,"0")+" 00000 n \n");
  str(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xr}\n%%EOF\n`);return new Blob(parts,{type:"application/pdf"})}
async function exportPNG(){const c=await renderFull({exp:true,t:mode==="video"?tpl().refT:null});return toBlob(c,"image/png")}
async function exportPDF(){const c=await renderFull({exp:true,t:mode==="video"?tpl().refT:null});const j=await toBlob(c,"image/jpeg",.95);return pdfFromJpeg(new Uint8Array(await j.arrayBuffer()),W,H)}
async function deliver(blob,name){const msg=$("resMsg"),img=$("resImg");$("res").classList.add("on");
  if(blob.type==="image/png"){img.src=URL.createObjectURL(blob);img.hidden=false}else img.hidden=true;
  const kb=Math.round(blob.size/1024);
  try{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
    msg.textContent=`تم تجهيز ${name} (${kb} ك.ب). إذا لم يبدأ التنزيل هنا${blob.type==="image/png"?"، اضغط مطولًا على الصورة لحفظها.":"، فالمتصفح الحالي يمنع التنزيل من هذه الصفحة."}`}
  catch(e){msg.textContent="تعذّر التنزيل في هذا المتصفح."}}
async function doExport(kind){const v=validate(),msg=$("resMsg");if(v){$("res").classList.add("on");$("resImg").hidden=true;msg.textContent=v;return}
  msg.textContent="جارٍ التجهيز…";$("res").classList.add("on");
  try{const b=kind==="png"?await exportPNG():await exportPDF();await deliver(b,`namq-${tpl().id}.${kind}`)}catch(e){msg.textContent="فشل التصدير: "+e.message+" — أعد المحاولة."}paint()}
$("xPng").onclick=()=>doExport("png");$("xPdf").onclick=()=>doExport("pdf");

/* ---------- التشغيل والوضع ---------- */
$("play").onclick=()=>{playing=!playing;$("play").textContent=playing?"إيقاف":"تشغيل";if(playing){vid.currentTime=0;vid.play().catch(()=>{});loop()}else{vid.pause();seek(tpl().refT).then(paint)}};
async function setMode(m){mode=m;T=tplFor(m);playing=false;vid.pause();$("play").textContent="تشغيل";hist=[];$("undo").disabled=true;sel=null;imgs={};
  $("mStatic").setAttribute("aria-pressed",m==="static");$("mVideo").setAttribute("aria-pressed",m==="video");
  S=null;try{const d=JSON.parse(localStorage.getItem(DKEY())||"null");if(d&&d.templateId===T.id)S=d}catch(e){}
  if(!S)S=newProject(m);S.fmtOpen=null;build();
  await Promise.all(FONTS.map(f=>document.fonts.load(`40px "${f}"`,"نمق ٢٥ abc").catch(()=>0)));
  if(m==="video"){tpl().duration=vid.duration||tpl().duration;await seek(tpl().refT)}paint()}
$("mStatic").onclick=()=>setMode("static");$("mVideo").onclick=()=>setMode("video");
addEventListener("resize",paint);
vid.addEventListener("loadedmetadata",()=>{if(T&&T.kind==="video")T.duration=vid.duration});
/* واجهة للاختبار الآلي وخادم التصدير */
const b64=async b=>{const u=new Uint8Array(await b.arrayBuffer());let s="";for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
window.NAMQ={ready:loadCustom().then(loadRemote).then(()=>setMode(CUSTOM?CUSTOM.kind:P.get("mode")==="video"?"video":"static")),setMode,get state(){return S},setState(s){S=s;build();paint()},validate,
  png:async()=>b64(await exportPNG()),pdf:async()=>b64(await exportPDF()),
  setImage(id,src){return new Promise(r=>{const im=new Image();im.onload=()=>{imgs[id]=im;build();paint();r()};im.src=src})},
  textFrame(t){const c=document.createElement("canvas");c.width=W;c.height=H;drawScene(c.getContext("2d"),{textOnly:true,exp:true,t});return c.toDataURL("image/png").split(",")[1]}};
/* ---------- ربط المنتج: الاسم والسعر من المتجر ---------- */
(async()=>{const bar=$("prod");await window.NAMQ.ready;if(!bar||!SLUG)return;$("seg").hidden=true;
  const show=(n,p)=>{bar.textContent="";const a=document.createElement("b");a.textContent=String(n).replace(/(\d+×\d+)/g,"\u2066$1\u2069");const s=document.createElement("span");
    s.textContent=[p,mode==="video"?"متحرك":"ثابت","\u2066"+W+"×"+H+"\u2069"].filter(Boolean).join(" · ");bar.append(a,s);bar.hidden=false;S.pname=n;save()};
  show(S.pname||SLUG.replace(/-/g," "),"");
  try{const m=await import("/js/wix/catalog.js"),p=await m.fetchProductBySlug(SLUG);if(p&&p.name){show(p.name,p.price||"");sizes(m,p)}}catch(e){}})();
/* متوفر بمقاسات أخرى: منتجات بنفس اسم التصميم (قبل « — ») ومقاس مختلف */
async function sizes(m,p){const base=s=>String(s).split(" — ")[0].trim(),sz=s=>(String(s).split(" — ")[1]||s).replace(/\s*\(تجريبي\)\s*/,"").trim().replace(/(\d+×\d+)/g,"\u2066$1\u2069");
  const r=await m.searchCatalog({limit:50,search:base(p.name)}).catch(()=>null);const sib=((r&&r.products)||[]).filter(x=>x.slug!==p.slug&&base(x.name)===base(p.name));if(!sib.length)return;
  const box=document.createElement("nav");box.className="sizes";box.setAttribute("aria-label","متوفر بمقاسات أخرى");const lb=document.createElement("span");lb.textContent="متوفر بمقاسات أخرى:";box.append(lb);
  const cur=document.createElement("b");cur.textContent=sz(p.name);cur.setAttribute("aria-current","true");cur.title="المقاس الحالي";box.append(cur);
  for(const x of sib){const a=document.createElement("a");a.href="/editor.html?mode=static&p="+encodeURIComponent(x.slug);a.textContent=sz(x.name);box.append(a)}$("prod").after(box)}
