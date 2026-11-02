"use client";
import { useEffect, useRef } from "react";

// A small procedural silk surface: no video, external assets, or third-party scripts.
// The CSS surface remains visible if WebGL is unavailable; reduced motion draws one frame.
const vertex = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision mediump float;
uniform vec2 resolution;uniform float time;
vec4 ribbon(vec2 uv,float phase,float width,vec3 tint){
 float y=uv.y;float flow=time*.15+phase;
 float center=.88+.18*sin(y*3.2+flow)+.10*sin(y*5.1-flow*.6)+.08*(y-.5);
 float cross=(uv.x-center)/width;
 float edge=1.-smoothstep(.84,1.08,abs(cross));
 float fold=.5+.5*sin(cross*3.8+y*2.7+flow*.6);
 float sheen=pow(max(0.,sin(cross*3.1+y*1.5+flow)),14.);
 float filament=.5+.5*sin(cross*150.+sin(y*9.+flow)*3.);
 vec3 fabric=mix(tint,vec3(.88,.74,.78),.32*fold+.18*sheen+.035*filament);
 return vec4(fabric,edge*.87);
}
void main(){vec2 uv=gl_FragCoord.xy/resolution;vec3 color=vec3(1.);
 vec4 a=ribbon(uv,0.,.17,vec3(.31,.0,.035));
 vec4 b=ribbon(uv,1.65,.14,vec3(.40,.065,.12));
 vec4 c=ribbon(uv,3.6,.12,vec3(.34,.025,.08));
 color=mix(color,a.rgb,a.a);color=mix(color,b.rgb,b.a);color=mix(color,c.rgb,c.a);
 gl_FragColor=vec4(color,1.);}`;
export default function MaroonRibbons() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;
    let frame = 0,
      last = 0,
      disposed = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex),
      fs = compile(gl.FRAGMENT_SHADER, fragment),
      program = gl.createProgram();
    if (!vs || !fs || !program) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    const location = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    const size = gl.getUniformLocation(program, "resolution"),
      clock = gl.getUniformLocation(program, "time");
    const draw = (t: number) => {
      if (disposed || gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(size, canvas.width, canvas.height);
      gl.uniform1f(clock, t / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      draw(motion.matches ? 0 : performance.now());
    };
    const tick = (t: number) => {
      if (disposed || document.hidden || motion.matches) return;
      if (t - last >= 33) {
        draw(t);
        last = t;
      }
      frame = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      if (motion.matches) draw(0);
      else if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      canvas.style.opacity = "0";
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    update();
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      canvas.removeEventListener("webglcontextlost", lost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);
  return (
    <div className="maroon-ribbons" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
