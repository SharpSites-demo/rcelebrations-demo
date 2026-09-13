/*
 * Ripple — vendored from Canvas UI (https://canvasui.dev, github.com/DavidHDev/canvas-ui)
 * Vanilla WebGL build, ported to plain JS for static hosting. No dependencies.
 * License: MIT + Commons Clause — Copyright (c) 2026 David Haz.
 * https://github.com/DavidHDev/canvas-ui/blob/main/LICENSE.md
 * WebGL2 effect: water ripples spread from every press and refract the live page like a pond surface.
 */
(function(){
"use strict";
var MAX_RIPPLES=12, BASE_SPEED=340;
var VERT="#version 300 es\nprecision highp float;\nlayout(location = 0) in vec2 aPos;\nout vec2 vUv;\nvoid main () {\n  vUv = aPos * 0.5 + 0.5;\n  gl_Position = vec4(aPos, 0.0, 1.0);\n}";
var FRAG="#version 300 es\nprecision highp float;\nin vec2 vUv;\nout vec4 outColor;\nuniform sampler2D uContent;\nuniform vec2 uResolution;\nuniform vec4 uRipples[12];\nuniform int uCount;\nuniform float uSpeed;\nuniform float uWavelength;\nuniform float uWidth;\nuniform float uDecay;\nuniform float uRefraction;\nuniform float uDispersion;\nuniform float uShine;\nuniform float uHasContent;\nuniform float uMaxX;\nvec4 page (vec2 p) {\n  p.x = clamp(p.x, 0.0005, uMaxX - 0.0005);\n  p.y = clamp(p.y, 0.0005, 0.9995);\n  return texture(uContent, p);\n}\nvoid main () {\n  vec2 pUv = vec2(vUv.x, 1.0 - vUv.y);\n  vec2 frag = pUv * uResolution;\n  vec2 grad = vec2(0.0);\n  float k = 6.28318530718 / uWavelength;\n  float w2 = uWidth * uWidth;\n  for (int i = 0; i < 12; i++) {\n    if (i >= uCount) break;\n    vec4 rp = uRipples[i];\n    vec2 dv = frag - rp.xy;\n    float r = length(dv);\n    float front = uSpeed * rp.z;\n    float s = r - front;\n    float env = exp(-s * s / w2) * exp(-uDecay * rp.z) * rp.w;\n    env *= smoothstep(0.0, 0.08, rp.z);\n    env *= inversesqrt(1.0 + front / max(uWavelength, 1.0) * 0.2);\n    if (env < 0.0015) continue;\n    float dh = (k * cos(s * k) - 2.0 * s / w2 * sin(s * k)) * env;\n    grad += dv / max(r, 1.0) * dh * uWavelength * 0.16;\n  }\n  float g = dot(grad, vec2(-0.55, -0.8));\n  float glint = pow(clamp(g * 2.2, 0.0, 1.0), 2.0) * uShine;\n  float shade = pow(clamp(-g * 1.6, 0.0, 1.0), 2.0) * uShine * 0.3;\n  if (uHasContent < 0.5) {\n    float a = clamp(glint * 0.9 + shade * 0.5, 0.0, 0.85);\n    outColor = vec4(vec3(glint * 0.9), a);\n    return;\n  }\n  vec2 offs = grad * uRefraction / uResolution;\n  vec3 col;\n  if (uDispersion > 0.001) {\n    float d = uDispersion * 0.35;\n    col = vec3(page(pUv + offs * (1.0 + d)).r, page(pUv + offs).g, page(pUv + offs * (1.0 - d)).b);\n  } else {\n    col = page(pUv + offs).rgb;\n  }\n  col += glint;\n  col *= 1.0 - shade;\n  outColor = vec4(col, 1.0);\n}";
function supportsHtmlInCanvas(){
try{
var probe=document.createElement("canvas");
var ctx=probe.getContext("2d");
return Boolean(ctx && typeof ctx.drawElementImage==="function" && typeof probe.requestPaint==="function");
}catch(e){return false}
}
function createRipple(elements, options){
var config={amplitude:0.5,speed:0.65,wavelength:80,rings:2,decay:1,refraction:100,dispersion:0.5,shine:0.5,trigger:"click",interval:0};
for(var k in (options||{})) config[k]=options[k];
var source=elements.source, content=elements.content, output=elements.output;
var gl=output.getContext("webgl2",{alpha:true,depth:false,stencil:false,antialias:false,premultipliedAlpha:true});
if(!gl||gl.isContextLost()) return null;
var sourceCtx=source.getContext("2d");
var htmlInCanvas=Boolean(sourceCtx && typeof sourceCtx.drawElementImage==="function" && typeof source.requestPaint==="function");
var contentDirty=false, wake=function(){};
if(htmlInCanvas){
source.onpaint=function(){ try{ sourceCtx.reset(); sourceCtx.drawElementImage(content,0,0); contentDirty=true; wake(); }catch(e){} };
}
function compile(type,text){ var s=gl.createShader(type); gl.shaderSource(s,text); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) console.error("Ripple shader error:",gl.getShaderInfoLog(s)); return s; }
var vs=compile(gl.VERTEX_SHADER,VERT), fs=compile(gl.FRAGMENT_SHADER,FRAG);
var program=gl.createProgram(); gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
var uniforms={}, count=gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS), i;
for(i=0;i<count;i++){ var info=gl.getActiveUniform(program,i); uniforms[info.name.replace("[0]","")]=gl.getUniformLocation(program,info.name); }
var quad=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,quad);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
var contentTexture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,contentTexture);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
var contentMaxX=1;
function syncCanvasSize(){
var dpr=Math.min(window.devicePixelRatio||1,2);
var width=Math.max(1,Math.round(output.clientWidth*dpr)), height=Math.max(1,Math.round(output.clientHeight*dpr));
if(output.width!==width||output.height!==height){ output.width=width; output.height=height; }
contentMaxX=Math.min(1,Math.max(0.05,content.clientWidth/Math.max(output.clientWidth,1)));
if(htmlInCanvas){
var cssWidth=Math.max(1,Math.round(source.clientWidth)), cssHeight=Math.max(1,Math.round(source.clientHeight));
if(source.width!==cssWidth*dpr||source.height!==cssHeight*dpr){ source.width=cssWidth*dpr; source.height=cssHeight*dpr; }
source.requestPaint();
}
}
syncCanvasSize();
function uploadContent(){
if(!htmlInCanvas||!contentDirty) return;
contentDirty=false;
gl.bindTexture(gl.TEXTURE_2D,contentTexture);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
}
var ripples=[], rippleData=new Float32Array(MAX_RIPPLES*4);
var motionQuery=window.matchMedia("(prefers-reduced-motion: reduce)");
var reducedMotion=motionQuery.matches;
function splash(x,y,strength){
if(reducedMotion) return;
if(ripples.length>=MAX_RIPPLES) ripples.shift();
ripples.push({x:x,y:y,age:0,amp:(strength==null?1:strength)});
start();
}
function pruneRipples(delta){
var diag=Math.hypot(output.clientWidth,output.clientHeight);
var speedPx=BASE_SPEED*Math.max(config.speed,0.05);
var width=config.wavelength*Math.max(config.rings,1)*0.5;
for(var j=ripples.length-1;j>=0;j--){
var rp=ripples[j]; rp.age+=delta;
var gone=rp.age*speedPx>diag+width*3||Math.exp(-Math.max(config.decay,0.05)*rp.age)*rp.amp<0.012;
if(gone) ripples.splice(j,1);
}
}
function render(){
uploadContent();
var dpr=output.width/Math.max(output.clientWidth,1);
gl.useProgram(program);
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,contentTexture);
gl.uniform1i(uniforms.uContent,0);
gl.uniform2f(uniforms.uResolution,output.width,output.height);
for(var n=0;n<MAX_RIPPLES;n++){ var rp=ripples[n];
rippleData[n*4]=rp?rp.x*dpr:0; rippleData[n*4+1]=rp?rp.y*dpr:0; rippleData[n*4+2]=rp?rp.age:0; rippleData[n*4+3]=rp?rp.amp*Math.max(config.amplitude,0):0; }
gl.uniform4fv(uniforms.uRipples,rippleData);
gl.uniform1i(uniforms.uCount,ripples.length);
gl.uniform1f(uniforms.uSpeed,BASE_SPEED*Math.max(config.speed,0.05)*dpr);
gl.uniform1f(uniforms.uWavelength,Math.max(config.wavelength,4)*dpr);
gl.uniform1f(uniforms.uWidth,Math.max(config.wavelength,4)*Math.max(config.rings,1)*0.5*dpr);
gl.uniform1f(uniforms.uDecay,Math.max(config.decay,0.05));
gl.uniform1f(uniforms.uRefraction,Math.max(config.refraction,0)*dpr);
gl.uniform1f(uniforms.uDispersion,Math.max(config.dispersion,0));
gl.uniform1f(uniforms.uShine,Math.max(config.shine,0));
gl.uniform1f(uniforms.uHasContent,htmlInCanvas?1:0);
gl.uniform1f(uniforms.uMaxX,contentMaxX);
gl.bindFramebuffer(gl.FRAMEBUFFER,null);
gl.viewport(0,0,output.width,output.height);
gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
function renderIdle(){
gl.bindFramebuffer(gl.FRAMEBUFFER,null);
gl.viewport(0,0,output.width,output.height);
if(htmlInCanvas){ render(); }
else { gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); }
}
var raf=0,lastTime=performance.now(),destroyed=false,running=false,visible=true;
function frame(now){
if(destroyed) return;
if(!visible){ running=false; return; }
var delta=Math.min(Math.max((now-lastTime)/1000,0),1/30);
lastTime=now;
if(!reducedMotion){
pruneRipples(delta);
if(config.interval>0){ ambientTimer+=delta; if(ambientTimer>=config.interval){ ambientTimer=0; splash(output.clientWidth*(0.15+Math.random()*0.7),output.clientHeight*(0.15+Math.random()*0.7),0.6+Math.random()*0.5); } }
}
if(ripples.length>0){ render(); }
else{ renderIdle(); if(!contentDirty&&(config.interval<=0||reducedMotion)){ running=false; return; } }
raf=requestAnimationFrame(frame);
}
var ambientTimer=0;
function start(){ if(destroyed||running||!visible) return; running=true; lastTime=performance.now(); raf=requestAnimationFrame(frame); }
wake=start; start();
function localPoint(e){ var rect=output.getBoundingClientRect(); return [e.clientX-rect.left,e.clientY-rect.top]; }
var hoverX=-1e5,hoverY=-1e5;
function onPointerDown(e){ if(config.trigger==="none") return; var p=localPoint(e); splash(p[0],p[1],1); }
function onPointerMove(e){ if(config.trigger!=="hover") return; var p=localPoint(e); if(Math.hypot(p[0]-hoverX,p[1]-hoverY)<56) return; hoverX=p[0]; hoverY=p[1]; splash(p[0],p[1],0.3); }
content.addEventListener("pointerdown",onPointerDown,{passive:true});
content.addEventListener("pointermove",onPointerMove,{passive:true});
function onMotionChange(){ reducedMotion=motionQuery.matches; if(reducedMotion) ripples.length=0; start(); }
motionQuery.addEventListener("change",onMotionChange);
var observer=new ResizeObserver(function(){ syncCanvasSize(); start(); });
observer.observe(output); observer.observe(content);
var intersection=new IntersectionObserver(function(entries){ visible=(entries[entries.length-1]||{}).isIntersecting!==false; if(visible) start(); });
intersection.observe(output);
return {
splash:splash,
resize:function(){ syncCanvasSize(); start(); },
destroy:function(){ destroyed=true; cancelAnimationFrame(raf);
content.removeEventListener("pointerdown",onPointerDown); content.removeEventListener("pointermove",onPointerMove);
observer.disconnect(); intersection.disconnect(); motionQuery.removeEventListener("change",onMotionChange);
gl.deleteTexture(contentTexture); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteBuffer(quad);
if(htmlInCanvas) source.onpaint=null; }
};
}
/* ---- wiring: hero panel only; fallback keeps content as normal HTML ---- */
window.addEventListener("DOMContentLoaded",function(){
var fxPanel=document.getElementById("fxRipple");
if(!fxPanel) return;
var source=document.getElementById("fxSource"), content=document.getElementById("fxContent"), output=document.getElementById("fxOutput");
var native=supportsHtmlInCanvas();
var instance=null;
if(native){
source.classList.add("is-native");
instance=createRipple({source:source,content:content,output:output},{amplitude:0.55,speed:0.6,wavelength:90,rings:2,refraction:110,dispersion:0.45,shine:0.55,trigger:"click",interval:0});
if(!instance){ native=false; source.classList.remove("is-native"); }
}
if(!native && content && content.parentNode!==fxPanel){ fxPanel.insertBefore(content,output); }
/* GSAP motion — conversion-first, reduced-motion safe */
var reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(reduce||!window.gsap) return;
gsap.registerPlugin(ScrollTrigger);
gsap.set(".fx-output",{opacity:native?1:0});
var tl=gsap.timeline({defaults:{ease:"power3.out"}});
tl.from(".hero .eyebrow",{y:18,opacity:0,duration:.6})
.from(".hero h1",{y:34,opacity:0,duration:.8},"-=.4")
.from(".hero .sub",{y:24,opacity:0,duration:.7},"-=.5")
.from(".hero .cta-row > *",{y:18,opacity:0,stagger:.12,duration:.6},"-=.4")
.from(".hero-trust",{opacity:0,duration:.6},"-=.3")
.from(".fx-ripple",{scale:.96,opacity:0,duration:.9,ease:"power2.out"},"-=.9");
gsap.utils.toArray(".sec-head").forEach(function(el){
gsap.from(el,{y:32,opacity:0,duration:.8,ease:"power3.out",scrollTrigger:{trigger:el,start:"top 85%"}});
});
gsap.utils.toArray(".pillar").forEach(function(el){
gsap.from(el.children,{y:36,opacity:0,duration:.8,stagger:.12,ease:"power3.out",scrollTrigger:{trigger:el,start:"top 82%"}});
});
gsap.from(".chip",{scale:.85,opacity:0,duration:.5,stagger:.04,ease:"back.out(1.6)",scrollTrigger:{trigger:".chip-row",start:"top 88%"}});
gsap.from(".step",{y:30,opacity:0,duration:.7,stagger:.12,ease:"power3.out",scrollTrigger:{trigger:".steps",start:"top 85%"}});
gsap.from(".quote",{y:34,opacity:0,duration:.8,stagger:.14,ease:"power3.out",scrollTrigger:{trigger:".quotes",start:"top 85%"}});
gsap.from(".v-row",{x:-26,opacity:0,duration:.6,stagger:.1,ease:"power3.out",scrollTrigger:{trigger:".v-list",start:"top 85%"}});
gsap.utils.toArray(".stat b").forEach(function(el){
var target=parseFloat(el.getAttribute("data-count")), dec=(target%1!==0)?1:0, obj={v:0};
gsap.to(obj,{v:target,duration:1.6,ease:"power2.out",scrollTrigger:{trigger:el,start:"top 88%"},
onUpdate:function(){ el.textContent=obj.v.toFixed(dec); }});
});
/* quote builder → pre-filled request */
var occ=document.getElementById("qbOcc"), guests=document.getElementById("qbGuests"), date=document.getElementById("qbDate"), need=document.getElementById("qbNeed"), send=document.getElementById("qbSend");
function update(){
var d=date.value?"on "+date.value:"date flexible";
var msg="Hi RCelebrations! I want a quote for my "+occ.value.toLowerCase()+" "+d+". Guests: "+guests.value+". Need: "+need.value+".";
send.href="https://wa.me/919811500961?text="+encodeURIComponent(msg);
}
[occ,guests,date,need].forEach(function(el){ el.addEventListener("change",update); });
document.querySelectorAll(".pillar-cta").forEach(function(el){ el.addEventListener("click",function(){ var n=el.getAttribute("data-need"); if(n){ need.value=n; update(); } }); });
update();
});
})();
