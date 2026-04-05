/* global AFRAME */
/**
 * Loaded synchronously in <head> so the shader exists before <a-scene> builds materials.
 */
AFRAME.registerShader('hacker-intervention', {
  schema: {
    u_time: { type: 'time', is: 'uniform' }
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

    float random (in vec2 _st) {
        return fract(sin(dot(_st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float noise (in vec2 _st) {
        vec2 i = floor(_st);
        vec2 f = fract(_st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm (in vec2 _st) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        for (int i = 0; i < 5; ++i) {
            v += a * noise(_st);
            _st = _st * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        float f = fbm(vUv * 3.0 + (u_time * 0.0005));
        // Wider ramp + floor alpha — old smoothstep(0.4,0.5,f) was ~0 almost everywhere
        float mask = 0.18 + 0.62 * smoothstep(0.15, 0.82, f);
        gl_FragColor = vec4(vec3(0.0), clamp(mask, 0.0, 1.0));
    }
  `
});
