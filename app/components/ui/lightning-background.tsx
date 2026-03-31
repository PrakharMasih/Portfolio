'use client';

import { useEffect, useRef } from 'react';

// ── Vertex shader ────────────────────────────────────────────────────────────
const VERT = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// ── Fragment shader — Hero Odyssey-style FBM continuous lightning ────────────
// Uses fractional Brownian motion with rotation (10 octaves) to continuously
// warp UV coordinates, producing a smooth organic flowing lightning effect.
// Three bolts at different x-offsets and speeds are composited in one pass.
// Outputs black background — use mix-blend-mode:screen on the canvas so only
// the bright pixels composite over the section.
const FRAG = `
precision mediump float;
uniform vec2  iResolution;
uniform float iTime;

#define OCTAVE_COUNT 10

// ── HSV → RGB ─────────────────────────────────────────────────────────────────
vec3 hsv2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

// ── Hash functions ───────────────────────────────────────────────────────────
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// ── Smooth noise ─────────────────────────────────────────────────────────────
float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float a = hash12(ip);
  float b = hash12(ip + vec2(1.0, 0.0));
  float c = hash12(ip + vec2(0.0, 1.0));
  float d = hash12(ip + vec2(1.0, 1.0));
  vec2 t = smoothstep(0.0, 1.0, fp);
  return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

// ── FBM with rotation each octave (same as Hero Odyssey) ─────────────────────
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float cosA = cos(0.45);
  float sinA = sin(0.45);
  mat2  rot  = mat2(cosA, -sinA, sinA, cosA);
  for (int i = 0; i < OCTAVE_COUNT; ++i) {
    value     += amplitude * noise(p);
    p          = rot * p * 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// ── Single bolt contribution ──────────────────────────────────────────────────
vec3 bolt(vec2 uv, float xOffset, float hue, float speed, float intensity, float size) {
  uv.x += xOffset;
  // FBM warp: core of the Hero Odyssey technique
  uv += 2.0 * fbm(uv * size + 0.8 * iTime * speed) - 1.0;
  float dist     = abs(uv.x);
  vec3  baseColor = hsv2rgb(vec3(hue / 360.0, 0.65, 0.9));
  // 1/dist glow with subtle time-flicker
  float flicker  = mix(0.0, 0.07, hash11(iTime * speed + xOffset * 13.7));
  vec3  col      = baseColor * (flicker / max(dist, 0.001)) * intensity;
  return col;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  uv  = 2.0 * uv - 1.0;
  uv.x *= iResolution.x / iResolution.y;

  vec3 col = vec3(0.0);

  // Centre bolt — primary, blue-violet
  col += bolt(uv,  0.0,  225.0, 1.5, 0.55, 2.0);
  // Left bolt — slightly cooler, slower
  col += bolt(uv, -0.35, 210.0, 1.1, 0.30, 1.8);
  // Right bolt — slightly warmer hue, different rhythm
  col += bolt(uv,  0.40, 240.0, 1.8, 0.28, 2.2);

  // Subtle radial vignette so edges stay dark
  float vignette = 1.0 - smoothstep(0.6, 1.4, length(uv * vec2(0.6, 1.0)));
  col *= vignette;

  gl_FragColor = vec4(col, 1.0);
}`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function LightningBackground({ className }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Use WebGL1 — same as Hero Odyssey source, wider device support
        const gl = canvas.getContext('webgl');
        if (!gl) return;

        const compile = (type: number, src: string): WebGLShader | null => {
            const s = gl.createShader(type);
            if (!s) return null;
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(s));
                gl.deleteShader(s);
                return null;
            }
            return s;
        };

        const vs = compile(gl.VERTEX_SHADER, VERT);
        const fs = compile(gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) return;

        const prog = gl.createProgram();
        if (!prog) return;
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
            return;
        }
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW,
        );

        const posLoc = gl.getAttribLocation(prog, 'aPosition');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const uRes = gl.getUniformLocation(prog, 'iResolution');
        const uTime = gl.getUniformLocation(prog, 'iTime');

        const resize = () => {
            const parent = canvas.parentElement;
            const dpr = Math.max(1, Math.min(devicePixelRatio, 2));
            canvas.width = (parent ? parent.offsetWidth : window.innerWidth) * dpr;
            canvas.height = (parent ? parent.offsetHeight : window.innerHeight) * dpr;
            gl.viewport(0, 0, canvas.width, canvas.height);
        };

        let raf: number;
        const startTime = performance.now();
        const render = () => {
            const t = (performance.now() - startTime) / 1000;
            gl.useProgram(prog);
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform1f(uTime, t);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            raf = requestAnimationFrame(render);
        };

        resize();
        render();

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
