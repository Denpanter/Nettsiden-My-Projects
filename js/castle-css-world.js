import * as T from './vendor/three.core.js';

// Image-based stage. The compositor animates the camera; JavaScript does not render flight frames.
const U=64, center=6.384, floor=3.87, frontZ=16, radius=2.02, spring=7.58;
const body=document.body, root=document.createElement('div');root.className='world-stage css-stage';const castleScreen = document.querySelector('.castle-screen');
if (castleScreen) castleScreen.append(root);
else body.prepend(root);
const view=document.createElement('div');view.className='css-view';root.append(view);
const rig=document.createElement('div');rig.className='css-camera';view.append(rig);
const camera=new T.PerspectiveCamera(52,1,.1,180), outside=new T.Vector3(3,12,39), inside=new T.Vector3(center,7.1,2.5);
const cameraPath=new T.CubicBezierCurve3(outside,new T.Vector3(center,7.1,30),new T.Vector3(center,7.1,18),inside);cameraPath.arcLengthDivisions=500;
const reduced=matchMedia('(prefers-reduced-motion:reduce)'), smoother=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
const surfaces=[], optics=[], doorHinges=[], projectEntries=[];
const assets={facade:'bilder/citadel-sculpted.png',stone:'bilder/layers/stone-material.png',hall:'bilder/layers/hall-background.png',banner:'bilder/layers/emerald-banner.png'};
const dimensions={};
await Promise.all(Object.values(assets).map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>{dimensions[src]=[img.naturalWidth,img.naturalHeight];resolve();};img.onerror=resolve;img.src=src;})));
const scaling=new T.Matrix4().makeScale(U,-U,U),inverseScaling=new T.Matrix4().makeScale(1/U,-1/U,1/U);
const transformMatrix=new T.Matrix4(), translation=new T.Matrix4(), look=new T.Vector3();
function cssMatrix(matrix){return `matrix3d(${matrix.elements.map(n=>Math.abs(n)<1e-10?0:n.toFixed(8)).join(',')})`;}
function objectCSS(object){object.updateMatrix();return cssMatrix(new T.Matrix4().multiplyMatrices(scaling,object.matrix).multiply(inverseScaling));}
function element(className,parent=rig){const el=document.createElement('div');el.className=className;parent.append(el);return el;}
function plane(w,h,x,y,z,options={}){
 const el=element('css-surface '+(options.className||'')),object=new T.Object3D();object.position.set(x,y,z);
 if(options.rx)object.rotation.x=options.rx;if(options.ry)object.rotation.y=options.ry;if(options.rz)object.rotation.z=options.rz;
 el.style.width=w*U+'px';el.style.height=h*U+'px';
 if(options.image){el.style.backgroundImage=`url("${options.image}")`;el.style.backgroundSize=options.tile?'128px 128px':options.contain?'contain':'100% 100%';el.style.backgroundRepeat=options.tile?'repeat':'no-repeat';el.style.backgroundPosition='center';}
 if(options.color)el.style.backgroundColor=options.color;
 if(options.opacity!==undefined)el.style.opacity=options.opacity;
 const entry={el,object,w,h,options};surfaces.push(entry);
 el.style.transform=objectCSS(object)+' translate(-50%,-50%)';
 if(options.focus!==false)optics.push(entry);
 return entry;
}
function move(entry){entry.el.style.transform=objectCSS(entry.object)+' translate(-50%,-50%)';}
// SVG clip paths are cut into surfaces, so holes reveal connected masonry behind them.
const defs=document.createElementNS('http://www.w3.org/2000/svg','svg');defs.classList.add('css-clip-defs');defs.setAttribute('aria-hidden','true');defs.innerHTML='<defs></defs>';body.append(defs);let clipCounter=0;
function clipHole(entry,cx,base,r,ground){
 const W=entry.w,H=entry.h,top=entry.object.position.y+H/2,left=entry.object.position.x-W/2;
 const x=(cx-left)/W,yy=(top-base)/H,rx=r/W,ry=r/H,bottom=(top-ground)/H;
 const path=`M0 0H1V1H0Z M${x-rx} ${bottom} V${yy} A${rx} ${ry} 0 0 1 ${x+rx} ${yy} V${bottom}Z`;
 const clip=document.createElementNS(defs.namespaceURI,'clipPath');const id='css-room-clip-'+(++clipCounter);clip.id=id;clip.setAttribute('clipPathUnits','objectBoundingBox');
 const p=document.createElementNS(defs.namespaceURI,'path');p.setAttribute('d',path);p.setAttribute('clip-rule','evenodd');p.setAttribute('fill-rule','evenodd');clip.append(p);defs.querySelector('defs').append(clip);entry.el.style.clipPath=`url(#${id})`;
}
const facade=plane(38,25.333,0,12.6665,16,{image:assets.facade,className:'css-facade',focus:false});clipHole(facade,center,spring,radius,floor);
// Two real, cropped image leaves rotate around their hinges, rather than fading to another picture.
const doorHeight=spring+radius-floor;
for(const side of [-1,1]){
 const hinge=element('css-door-hinge'),object=new T.Object3D();object.position.set(center+side*radius,floor,16.025);hinge.style.transform=objectCSS(object);
 const leaf=element('css-door-leaf',hinge);leaf.style.width=radius*U+'px';leaf.style.height=doorHeight*U+'px';leaf.style.left=(side===-1?0:-radius*U)+'px';leaf.style.top=-doorHeight*U+'px';
 leaf.style.transformOrigin=side===-1?'0% 100%':'100% 100%';leaf.style.backgroundImage=`url(${assets.facade})`;leaf.style.backgroundSize=`${38*U}px ${25.333*U}px`;
 leaf.style.backgroundPosition=`${-(center+(side===-1?-radius:0)+19)*U}px ${-(25.333-spring-radius)*U}px`;
 const arc=[];
 for(let i=0;i<=18;i++){const a=side===-1?Math.PI/2+i/18*Math.PI/2:i/18*Math.PI/2;const x=(Math.cos(a)*radius+(side===-1?radius:0))/radius,y=radius*(1-Math.sin(a))/doorHeight;arc.push(`${x*100}% ${y*100}%`);}
 const polygon=side===-1?['0% 100%','100% 100%',...arc]:['0% 100%','100% 100%',...arc];leaf.style.clipPath=`polygon(${polygon.join(',')})`;
 doorHinges.push({hinge,object,leaf,side});
}
// Floor, roof, side walls and far wall share edges; no isolated background cards.
plane(27,31.45,center,floor,.275,{image:assets.stone,tile:true,rx:-Math.PI/2,className:'css-floor'});
plane(10,12,center,floor+.012,-8,{rx:-Math.PI/2,className:'css-window-pool',focus:false});
plane(27,31.45,center,floor+18,.275,{image:assets.stone,tile:true,rx:Math.PI/2,className:'css-ceiling'});
for(const side of [-1,1])plane(31.45,18,center+side*13.5,floor+9,.275,{image:assets.stone,tile:true,ry:-side*Math.PI/2,className:'css-sidewall'});
plane(27,18,center,floor+9,-15.45,{image:assets.hall,className:'css-painted-wall',focus:false});
function wallArch(z,r,base){const wall=plane(27,18,center,floor+9,z,{image:assets.stone,tile:true,className:'css-arch-wall'});clipHole(wall,center,floor+base,r,floor-.002);
 // The stone soffit is built from joined, textured image strips; its edge cannot become a floating sheet.
 for(let i=0;i<28;i++){const a=(i+.5)/28*Math.PI,strip=plane(r*Math.PI/28+.02,.85,center+Math.cos(a)*r,floor+base+Math.sin(a)*r,z-.425,{image:assets.stone,tile:true,className:'css-arch-soffit'});strip.object.rotation.set(0,0,a-Math.PI/2);strip.object.rotateX(Math.PI/2);move(strip);}
 for(const side of [-1,1])plane(.85,base,center+side*r,floor+base/2,z-.425,{image:assets.stone,tile:true,ry:side*Math.PI/2,className:'css-arch-soffit'});
}
wallArch(8.5,5.3,4.5);wallArch(-3,8.8,5);
// A continuous, round-vaulted vestibule joins the outside opening to the room.
for(const side of [-1,1])plane(7.2,3.71,center+side*radius,floor+1.855,12.4,{image:assets.stone,tile:true,ry:side*Math.PI/2,className:'css-tunnel'});
for(let i=0;i<24;i++){const a=(i+.5)/24*Math.PI,strip=plane(radius*Math.PI/24+.02,7.2,center+Math.cos(a)*radius,spring+Math.sin(a)*radius,12.4,{image:assets.stone,tile:true,className:'css-tunnel'});strip.object.rotation.set(0,0,a-Math.PI/2);strip.object.rotateX(Math.PI/2);move(strip);}
// Attached tapestries and practical lamps provide detail at multiple distances.
for(const side of [-1,1]){
 plane(1.7,5.4,center+side*10.3,floor+8,-15.36,{image:assets.banner,contain:true,className:'css-banner'});
 const banner=plane(2.1,6.8,center+side*13.44,floor+10.5,-5,{image:assets.banner,contain:true,ry:-side*Math.PI/2,className:'css-banner'});
}
for(const [x,z] of [[center-1.83,14.5],[center+1.83,14.5],[center-6,9],[center+6,9],[center-8.7,-15.1],[center+8.7,-15.1]]){
 const lamp=plane(.46,.9,x,floor+2.8,z,{className:'css-lamp',focus:false});lamp.el.innerHTML='<i class="css-lamp-roof"></i><i class="css-lamp-glass"></i><i class="css-lamp-foot"></i>';
 const glow=plane(2.8,3.4,x,floor+2.8,z-.03,{className:'css-lamp-glow',focus:false});
}
const projects=[{id:'reader',name:'Context Reader',image:'bilder/reader-cover.png'},{id:'shorts',name:'Shorts Lab',image:'bilder/shorts-cover.png'},{id:'orbital',name:'Orbital Arsenal',image:'bilder/orbital-cover.jpg'}];
for(let i=0;i<projects.length;i++){
 const p=projects[i];p.x=center+(i-1)*5.2;p.entries=[];
 const niche=plane(4.74,7.1,p.x,floor+3.55,-15.34,{className:'css-project-niche'});niche.el.innerHTML='<i></i>';p.entries.push(niche);
 const art=plane(4.15,5.55,p.x,7.7,-15.18,{className:'css-project-art',focus:false});const img=document.createElement('img');img.src=p.image;img.alt='';art.el.append(img);p.entries.push(art);
 const shadow=plane(5.2,1.45,p.x,floor+.01,-14.9,{rx:-Math.PI/2,className:'css-contact-shadow',focus:false});p.entries.push(shadow);
 const btn=document.createElement('button');btn.className='world-project';btn.innerHTML=`<span>${p.name} ↗</span>`;btn.setAttribute('aria-label','Explore '+p.name);root.append(btn);p.button=btn;
 btn.addEventListener('click',()=>{const d=document.getElementById('dialog-'+p.id);if(d){d.showModal();d.scrollTop=0;}});
}
// Small, soft dust motes use native animations and remain confined to the room.
let seed=312;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
for(let i=0;i<38;i++){const mote=plane(.025+random()*.025,.025+random()*.025,center+(random()-.5)*12,floor+.5+random()*9,-13+random()*24,{className:'css-dust',focus:false});mote.el.style.animationDelay=-random()*8+'s';}
const lens=element('css-lens',root);
const title=document.createElement('div');title.className='world-title';title.innerHTML='<p>INSIDE THE CITADEL / SELECTED WORK</p><h1>The project hall.</h1>';body.append(title);
const intro=document.createElement('div');intro.className='world-outside-copy';intro.innerHTML='<p>A WORLD OF MY OWN</p><h1>Game.<br>Create.<br>Think.</h1><button type="button">Enter the Citadel <span>↗</span></button>';(castleScreen || body).append(intro);
const hint=document.createElement('p');hint.className='world-hint';(castleScreen || body).append(hint);
const controls=document.createElement('div');controls.className='world-gallery-controls';controls.innerHTML='<button type="button" aria-label="Previous project">←</button><span></span><button type="button" aria-label="Next project">→</button>';body.append(controls);
const navigation=document.querySelector('header nav');if(navigation)navigation.innerHTML='<a href="index.html">Home</a><a href="project.html">My projects</a>';
document.querySelectorAll('.project-dialog').forEach(d=>{body.append(d);d.querySelector('.dialog-close')?.addEventListener('click',()=>d.close());d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});});
let progress=location.pathname.endsWith('project.html')?1:0,compact=false,galleryIndex=0,flying=false,flightAnimation=null;
const review=new URLSearchParams(location.search).get('review');if(review!==null&&Number.isFinite(+review))progress=T.MathUtils.clamp(+review,0,1);
let perspective=600,stageRect=root.getBoundingClientRect();
function pose(value){camera.position.copy(cameraPath.getPointAt(value));look.copy(camera.position);look.z-=20;look.y+=smoother(value)*.914;camera.lookAt(look);camera.updateMatrixWorld();
 transformMatrix.multiplyMatrices(scaling,camera.matrixWorldInverse).multiply(inverseScaling);translation.makeTranslation(0,0,perspective);transformMatrix.premultiply(translation);return cssMatrix(transformMatrix);}
function setDoors(value){for(const door of doorHinges){const open=smoother((value-(door.side===1?.018:0))/.3);door.leaf.style.transform=`rotateY(${-door.side*open*(door.side===1?1.64:1.70)}rad)`;}}
function arrange(){for(let i=0;i<projects.length;i++){const p=projects[i],x=center+(compact?i-galleryIndex:i-1)*5.2;for(const entry of p.entries){entry.object.position.x=x;move(entry);}p.x=x;p.button.hidden=compact&&i!==galleryIndex;}controls.hidden=!compact;controls.querySelector('span').textContent=`${galleryIndex+1} / 3`;}
function labels(){pose(progress);for(const p of projects){const point=new T.Vector3(p.x,7.7,-15.1).project(camera),corner=new T.Vector3(p.x+2.05,10.45,-15.1).project(camera);p.button.style.left=(point.x*.5+.5)*stageRect.width+'px';p.button.style.top=(-point.y*.5+.5)*stageRect.height+'px';p.button.style.width=Math.abs(corner.x-point.x)*stageRect.width+'px';p.button.style.height=Math.abs(corner.y-point.y)*stageRect.height+'px';}}
function restingOptics(value){for(const entry of optics){const distance=Math.abs(camera.position.z-entry.object.position.z);const blur=value>.99&&distance<7?.7:0;entry.el.style.filter=blur?`blur(${blur*distance*U/perspective}px)`:'none';}}
function state(){body.classList.toggle('in-hall',progress>.995&&!flying);body.classList.toggle('flying',flying||(review!==null&&progress>0&&progress<1));intro.inert=progress>.995||flying;title.inert=progress<.995||flying;controls.inert=progress<.995||flying;body.style.setProperty('--gallery-reveal',progress>.995&&!flying?'1':'0');for(const link of document.querySelectorAll('header nav a')){if(link.getAttribute('href')===(progress>.995?'project.html':'index.html'))link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}document.title=progress>.995?'My projects — Burmak':'Burmak — Game. Create. Think.';hint.textContent=progress>.995?'SELECTED WORK / THREE PROJECTS':'01 — THE CITADEL';for(const p of projects){p.button.tabIndex=progress>.995&&!flying?0:-1;p.button.inert=progress<.995||flying;p.button.setAttribute('aria-hidden',String(progress<.995||flying));}}
function resize(){if(flying)return;stageRect=root.getBoundingClientRect();camera.aspect=stageRect.width/stageRect.height;camera.updateProjectionMatrix();perspective=stageRect.height/(2*Math.tan(T.MathUtils.degToRad(26)));view.style.perspective=perspective+'px';compact=camera.aspect<.95;inside.z=compact?-5:2.5;outside.z=16+Math.min(23,(2 * (19 - Math.abs(outside.x)) - .2)/(2*Math.tan(T.MathUtils.degToRad(26))*camera.aspect));if (castleScreen) {
  const pixelsPerUnit = perspective / (outside.z - frontZ);
  outside.y = stageRect.height / (2 * pixelsPerUnit);
  castleScreen.parentElement.style.setProperty('--castle-image-width', `${38 * pixelsPerUnit}px`);
  castleScreen.parentElement.style.setProperty('--castle-image-left', `${stageRect.width / 2 - (19 + outside.x) * pixelsPerUnit}px`);
}
cameraPath.updateArcLengths();arrange();rig.style.transform=pose(progress);setDoors(progress);labels();restingOptics(progress);}
function finish(inward,push){progress=inward?1:0;flying=false;body.dataset.flight='idle';rig.style.transform=pose(progress);setDoors(progress);for(const el of [rig,...doorHinges.map(d=>d.leaf)])el.getAnimations().forEach(a=>a.cancel());if(push)history.pushState({hall:inward},'',inward?'project.html':'index.html');state();resize();}
async function fly(inward,push=true){if(flying||Math.abs(progress-(inward?1:0))<.001)return;const start=progress,end=inward?1:0;flying=true;body.dataset.flight='passing';state();
 const frames=[],doorFrames=doorHinges.map(()=>[]);const duration=reduced.matches?1:2200;const started=performance.now();
 for(let i=0;i<=100;i++){const t=i/100,movement=inward?smoother(Math.max(0,(t-.12)/.88)):smoother(t),value=start+(end-start)*movement;frames.push({offset:t,transform:pose(value)});
 for(let j=0;j<doorHinges.length;j++){const d=doorHinges[j],doorValue=inward?Math.max(value,smoother(t/.25)*.3):value,open=smoother((doorValue-(d.side===1?.018:0))/.3);doorFrames[j].push({offset:t,transform:`rotateY(${-d.side*open*(d.side===1?1.64:1.70)}rad)`});}}
 // A native keyframe animation continues smoothly even while the main thread handles UI work.
 rig.style.transform=frames[0].transform;flightAnimation=rig.animate(frames,{duration,easing:'linear',fill:'forwards'});
 doorHinges.forEach((d,i)=>d.leaf.animate(doorFrames[i],{duration,easing:'linear',fill:'forwards'}));
 lens.animate([{opacity:.25},{opacity:.65,offset:.55},{opacity:.25}],{duration,easing:'ease-in-out'});
 try{await flightAnimation.finished;}catch(e){}root.dataset.nativeFlightMs=String(Math.round(performance.now()-started));finish(inward,push);
}
intro.querySelector('button').addEventListener('click',()=>fly(true));
document.querySelectorAll('header a').forEach(a=>a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;const href=a.getAttribute('href');if(href==='index.html'||href==='#home'||href.startsWith('project.html')){e.preventDefault();fly(href.startsWith('project.html'));}}));
window.addEventListener('popstate',()=>fly(location.pathname.endsWith('project.html'),false));window.addEventListener('resize',resize);
controls.querySelectorAll('button').forEach((button,i)=>button.addEventListener('click',()=>{galleryIndex=(galleryIndex+(i===0?-1:1)+3)%3;arrange();labels();}));
// Keep the existing cursor-driven ivy and light behavior in a lightweight 2D facade layer.
const vegetation=document.createElement('canvas');vegetation.width=1536;vegetation.height=1024;vegetation.className='css-vegetation';facade.el.append(vegetation);const ctx=vegetation.getContext('2d');
const vines=[],lights=[[.353,.365],[.417,.365],[.648,.18],[.667,.17],[.684,.18],[.873,.355],[.941,.35],[.336,.579],[.499,.547],[.816,.533],[.957,.586],[.675,.41],[.436,.689],[.498,.689],[.83,.689]].map(([x,y])=>({x:x*1536,y:y*1024,energy:0}));
for(const [x,y,len]of [[.32,.44,.37],[.36,.43,.27],[.48,.51,.29],[.55,.49,.21],[.77,.49,.27],[.82,.4,.37],[.94,.43,.4]]){const nodes=[];for(let i=0;i<=24;i++){const t=i/24,p=new T.Vector2(x*1536+Math.sin(t*8+x*10)*18*t,(y+len*t)*1024);nodes.push({p,old:p.clone(),rest:p.clone()});}vines.push({nodes,lengths:nodes.slice(1).map((n,i)=>n.p.distanceTo(nodes[i].p)),seed:x});}
const cursor=new T.Vector2(-9999,-9999),ray=new T.Raycaster(),hit=new T.Vector3(),wallPlane=new T.Plane(new T.Vector3(0,0,1),-16);let interactionUntil=0;
root.addEventListener('pointermove',e=>{if(flying||progress>.01)return;pose(0);ray.setFromCamera(new T.Vector2((e.clientX-stageRect.left)/stageRect.width*2-1,-((e.clientY-stageRect.top)/stageRect.height*2-1)),camera);if(ray.ray.intersectPlane(wallPlane,hit)){cursor.set((hit.x+19)/38*1536,(25.333-hit.y)/25.333*1024);interactionUntil=performance.now()+2500;}});
root.addEventListener('pointerleave',()=>{cursor.set(-9999,-9999);interactionUntil=performance.now()+2500;});
root.addEventListener('click',e=>{if(flying||progress>.01)return;pose(0);ray.setFromCamera(new T.Vector2((e.clientX-stageRect.left)/stageRect.width*2-1,-((e.clientY-stageRect.top)/stageRect.height*2-1)),camera);if(ray.ray.intersectPlane(wallPlane,hit)){const x=(hit.x+19)/38,y=(25.333-hit.y)/25.333;if(Math.abs(x-.668)<.06&&y>.61&&y<.86)fly(true);}});
function leaf(x,y,size,angle){ctx.save();ctx.shadowColor='#0006';ctx.shadowBlur=1.7;ctx.shadowOffsetY=1;ctx.translate(x,y);ctx.rotate(angle);const g=ctx.createLinearGradient(-size,0,size,0);g.addColorStop(0,'#172c20');g.addColorStop(.48,'#577142');g.addColorStop(.54,'#778557');g.addColorStop(1,'#243d2a');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,size);ctx.lineTo(-size*.8,.1*size);ctx.lineTo(-size,-size*.3);ctx.lineTo(-size*.35,-size*.4);ctx.lineTo(-size*.25,-size);ctx.lineTo(0,-size*.6);ctx.lineTo(size*.25,-size);ctx.lineTo(size*.35,-size*.4);ctx.lineTo(size,-size*.3);ctx.lineTo(size*.8,size*.1);ctx.closePath();ctx.fill();ctx.restore();}
function drawVegetation(simulate){ctx.clearRect(0,0,1536,1024);for(const vine of vines){const ns=vine.nodes;if(simulate&&!reduced.matches){for(let i=1;i<ns.length;i++){const n=ns[i],vx=(n.p.x-n.old.x)*.93,vy=(n.p.y-n.old.y)*.93;n.old.copy(n.p);n.p.x+=vx+(n.rest.x-n.p.x)*.016;n.p.y+=vy+(n.rest.y-n.p.y)*.016;const dx=n.p.x-cursor.x,dy=n.p.y-cursor.y,d=Math.hypot(dx,dy),strength=Math.max(0,1-d/110);n.p.x+=dx/(d||1)*strength*2.0;n.p.y+=dy/(d||1)*strength*.8;}
 for(let k=0;k<5;k++){ns[0].p.copy(ns[0].rest);for(let i=1;i<ns.length;i++){const a=ns[i-1].p,b=ns[i].p,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,error=(d-vine.lengths[i-1])/d,share=i===1?1:.5;b.x-=dx*error*share;b.y-=dy*error*share;if(i>1){a.x+=dx*error*.5;a.y+=dy*error*.5;}}}}
 ctx.strokeStyle='#3f4c31';ctx.lineWidth=2;ctx.beginPath();ns.forEach((n,i)=>i?ctx.lineTo(n.p.x,n.p.y):ctx.moveTo(n.p.x,n.p.y));ctx.stroke();for(let i=1;i<ns.length;i++){const n=ns[i].p,prev=ns[i-1].p,a=Math.atan2(n.x-prev.x,n.y-prev.y);for(const side of [-1,1]){if((i+side)%3===0)continue;leaf(n.x+side*(7+Math.abs(Math.sin(i*2.7))*5),n.y,7+Math.abs(Math.sin(i*1.7))*5,side*.55+a*.5);}}}
 ctx.globalCompositeOperation='screen';for(const l of lights){const desired=Math.max(0,1-Math.hypot(l.x-cursor.x,l.y-cursor.y)/170);l.energy+=(desired-l.energy)*(desired>l.energy?.2:.04);const radius=22+l.energy*35,g=ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,radius);g.addColorStop(0,`rgba(255,195,91,${.12+l.energy*.75})`);g.addColorStop(.25,`rgba(240,155,57,${.04+l.energy*.18})`);g.addColorStop(1,'#e6a04b00');ctx.fillStyle=g;ctx.fillRect(l.x-radius,l.y-radius,radius*2,radius*2);}ctx.globalCompositeOperation='source-over';}
let lastDraw=0;function foliageLoop(time){requestAnimationFrame(foliageLoop);if(flying||progress>.01||time-lastDraw<32||time>interactionUntil)return;lastDraw=time;drawVegetation(true);}drawVegetation(false);requestAnimationFrame(foliageLoop);
await Promise.all([...root.querySelectorAll('.css-project-art img')].map(img=>img.decode().catch(()=>{})));
resize();state();body.classList.add('world-ready');if(review!==null&&progress>0&&progress<1)body.classList.add('flying');
