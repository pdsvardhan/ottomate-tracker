'use client';

// Multi-hue WebGL plasma background (ported from overview mockup Version C).
// Fixed behind the project showcase. 30fps-capped, DPR-capped, guarded; falls
// back to a static CSS gradient when WebGL is unavailable or reduced-motion.

import { useEffect, useRef } from 'react';

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = [
  'precision highp float;',
  'uniform vec2 R;uniform float T;',
  'vec3 mag=vec3(1.0,0.24,0.545);',
  'vec3 vio=vec3(0.659,0.333,0.969);',
  'vec3 cyn=vec3(0.133,0.827,0.933);',
  'vec3 cor=vec3(1.0,0.541,0.357);',
  'vec3 amb=vec3(0.961,0.698,0.235);',
  'void main(){',
  '  vec2 uv=(gl_FragCoord.xy-0.5*R)/R.y;',
  '  float t=T*0.06;',
  '  float v=0.0;',
  '  vec2 q=uv*2.2;',
  '  v+=sin(q.x*1.6+t*1.4);',
  '  v+=sin((q.y*1.7-t*1.1));',
  '  v+=sin((q.x+q.y)*1.2+t*0.9);',
  '  v+=sin(length(q- vec2(sin(t*0.7),cos(t*0.5)))*2.4 - t*1.3);',
  '  v*=0.25;',
  '  float f=0.5+0.5*sin(v*3.1416+t);',
  '  float g=0.5+0.5*sin(v*3.1416*1.7 - t*1.2 + 1.5);',
  '  vec3 col=mix(mag,cyn,smoothstep(0.0,1.0,f));',
  '  col=mix(col,vio,smoothstep(0.2,0.9,g));',
  '  col=mix(col,cor,0.28*smoothstep(0.6,1.0,f*g));',
  '  col=mix(col,amb,0.14*smoothstep(0.7,1.0,sin(v*4.0+t)*0.5+0.5));',
  '  float d=length(uv);',
  '  float glow=smoothstep(1.25,0.1,d);',
  '  col*= (0.18+0.55*glow);',
  '  col=mix(vec3(0.027,0.031,0.067),col,0.62*glow+0.12);',
  '  gl_FragColor=vec4(col,1.0);',
  '}',
].join('\n');

const CSS_FALLBACK =
  'radial-gradient(120% 90% at 20% 10%,rgba(255,61,139,.14),transparent 45%),' +
  'radial-gradient(120% 90% at 80% 20%,rgba(34,211,238,.12),transparent 45%),' +
  'radial-gradient(120% 100% at 50% 90%,rgba(168,85,247,.14),transparent 50%),#070811';

export function ShaderBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (!gl) {
      canvas.style.background = CSS_FALLBACK;
      return;
    }
    const glc = gl;

    const compile = (type: number, src: string) => {
      const s = glc.createShader(type)!;
      glc.shaderSource(s, src);
      glc.compileShader(s);
      return s;
    };
    const prog = glc.createProgram()!;
    glc.attachShader(prog, compile(glc.VERTEX_SHADER, VS));
    glc.attachShader(prog, compile(glc.FRAGMENT_SHADER, FS));
    glc.linkProgram(prog);
    glc.useProgram(prog);
    const buf = glc.createBuffer();
    glc.bindBuffer(glc.ARRAY_BUFFER, buf);
    glc.bufferData(glc.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), glc.STATIC_DRAW);
    const loc = glc.getAttribLocation(prog, 'p');
    glc.enableVertexAttribArray(loc);
    glc.vertexAttribPointer(loc, 2, glc.FLOAT, false, 0, 0);
    const uR = glc.getUniformLocation(prog, 'R');
    const uT = glc.getUniformLocation(prog, 'T');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.4);

    const resize = () => {
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      glc.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    let raf = 0;
    const t0 = performance.now();
    if (reduce) {
      glc.uniform2f(uR, canvas.width, canvas.height);
      glc.uniform1f(uT, 12.0);
      glc.drawArrays(glc.TRIANGLES, 0, 3);
    } else {
      let last = 0;
      const loop = (now: number) => {
        if (now - last > 32) {
          last = now;
          glc.uniform2f(uR, canvas.width, canvas.height);
          glc.uniform1f(uT, (now - t0) / 1000);
          glc.drawArrays(glc.TRIANGLES, 0, 3);
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      const ext = glc.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ zIndex: -3 }} className="fixed inset-0 block h-full w-full" />;
}
