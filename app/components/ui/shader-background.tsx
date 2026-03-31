'use client';

import { useEffect, useRef } from 'react';

// ── Vertex shader (passthrough) ──────────────────────────────────────────────
const VERT = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

// ── Fragment shader ──────────────────────────────────────────────────────────
// Original cloud/orb shader by Matthias Hurrle (@atzedent).
// Colors remapped to portfolio palette:
//   primary glow  → indigo/violet  (#818cf8 / #6366f1)
//   secondary glow → teal/mint     (#6ee7b7)
//   cloud fog      → deep indigo   (matching --bg: #090c12)
const FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T  time
#define R  resolution
#define MN min(R.x,R.y)

float rnd(vec2 p){
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p){
  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  float a=rnd(i),b=rnd(i+vec2(1,0)),c=rnd(i+vec2(0,1)),d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p){
  float t=.0,a=1.;mat2 m=mat2(1.,-.5,.2,1.2);
  for(int i=0;i<5;i++){t+=a*noise(p);p*=2.*m;a*=.5;}
  return t;
}
float clouds(vec2 p){
  float d=1.,t=.0;
  for(float i=.0;i<3.;i++){
    float a=d*fbm(i*10.+p*.2+.2*(1.+i)*p.y+d+i*i+p);
    t=mix(t,d,a);d=a;p*=2./(i+1.);
  }
  return t;
}
void main(void){
  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
  vec3 col=vec3(0);
  // slow scroll so it reads as ambient, not distracting
  float bg=clouds(vec2(st.x+T*.3,-st.y));
  uv*=1.-.3*(sin(T*.15)*.5+.5);
  for(float i=1.;i<12.;i++){
    uv+=.1*cos(i*vec2(.1+.01*i,.8)+i*i+T*.4+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    // Indigo/violet orb glow — weight B channel for #818cf8 feel
    col+=.0028/d*(cos(sin(i)*vec3(1,2,3))+1.)*vec3(1.0,1.0,1.0);
    float b=noise(i+p+bg*1.731);
    // Cool-white secondary glow for the lines
    col+=.0020*b/max(length(max(p,vec2(b*p.x*.02,p.y))),0.001)*vec3(0.88,0.94,1.0);
    // Background fog blends to cool deep indigo (matches --bg #090c12 with cyan tint)
    col=mix(col,vec3(bg*.025,bg*.038,bg*.20),d);
  }
  // Brighter output — section bg color + CSS opacity handle final visibility
  col*=1.35;
  O=vec4(col,1);
}`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShaderBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    const compileShader = (type: number, src: string): WebGLShader => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, VERT);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'resolution');
    const uTime = gl.getUniformLocation(prog, 'time');

    const resize = () => {
      const dpr = Math.max(1, 0.5 * devicePixelRatio);
      canvas.width = (canvas.parentElement?.offsetWidth ?? window.innerWidth) * dpr;
      canvas.height = (canvas.parentElement?.offsetHeight ?? window.innerHeight) * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    let raf: number;
    const render = (now: number) => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now * 1e-3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };

    resize();
    render(0);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? document.body);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
