/* global AFRAME */
/**
 * Loaded synchronously in <head> so the shader exists before <a-scene> builds materials.
 * Pixelated overlay: quantized UV cells, band tear, scan hits, sparse RGB error blocks.
 */
AFRAME.registerShader('hacker-intervention', {
  schema: {
    u_time: { type: 'time', is: 'uniform' },
    u_grid: { type: 'number', is: 'uniform', default: 64 },
    u_glitch: { type: 'number', is: 'uniform', default: 1 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform float u_time;
    uniform float u_grid;
    uniform float u_glitch;

    float random(in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      float t = u_time * 0.001;
      /* A-Frame sometimes leaves custom uniforms at 0 until first attribute set */
      float gGrid = u_grid > 2.0 ? u_grid : 72.0;
      float gMul = u_glitch > 0.05 ? u_glitch : 1.0;
      float G = clamp(gMul, 0.25, 2.5);
      float grid = max(gGrid * (0.85 + 0.15 * G), 16.0);

      /* Horizontal band index → per-band horizontal tear in cell space */
      float bandCount = 32.0;
      float by = floor(vUv.y * bandCount);
      float tear = floor(7.0 * sin(by * 1.37 + t * 2.4) * G);
      vec2 uv = vUv;
      uv.x += (tear / grid) * 0.22 * G;

      /* Discrete time for block flicker */
      float tick = floor(t * 14.0);

      vec2 cell = floor(uv * grid);
      vec2 bigCell = floor(uv * grid * 0.26);

      float r0 = random(cell + vec2(tick, 0.0));
      float r1 = random(cell.yx * 1.91 + vec2(3.0, tick * 1.7));
      float r2 = random(bigCell + vec2(99.0, tick * 0.41));

      /* Row-static / scanline spikes */
      float row = floor(vUv.y * grid * 1.05);
      float scan = step(0.935, random(vec2(row + tick * 2, 17.0)));

      /* Coarse mosaic alpha — hard steps only (no smooth fbm) */
      float dark = 0.1;
      dark += step(0.52, r0) * 0.32 * G;
      dark += step(0.78, r1) * 0.38 * G;
      dark += step(0.88, r2) * 0.12 * G;
      dark *= mix(0.55, 1.0, scan * G + 0.4);
      dark = clamp(dark, 0.08, 0.9);

      /* Sparse saturated error blocks */
      float pop = step(0.86 - G * 0.04, r1 * r2);
      vec3 g1 = vec3(0.15, 0.95, 0.88);
      vec3 g2 = vec3(1.0, 0.12, 0.45);
      vec3 g3 = vec3(0.25, 0.35, 1.0);
      vec3 gcol = mix(g1, g2, step(0.45, random(cell + vec2(7.0, tick))));
      gcol = mix(gcol, g3, step(0.72, random(cell + vec2(13.0, tick * 0.5))));

      vec3 rgb = gcol * pop * G;
      float alpha = clamp(dark + pop * 0.55 * G, 0.0, 1.0);
      gl_FragColor = vec4(rgb, alpha);
    }
  `
});
