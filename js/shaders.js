/**
 * WebGL shader sources for the glitch post-process pass.
 * Exposed globally so the app works when opened via file:// without a module bundler.
 */
window.REALITY_SHADERS = {
  vert: `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`,
  frag: `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_tex;
  uniform float u_time;
  uniform float u_intensity;
  uniform vec2 u_res;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = rand(i);
    float b = rand(i + vec2(1,0));
    float c = rand(i + vec2(0,1));
    float d = rand(i + vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }

  void main() {
    vec2 uv = v_uv;
    float t = u_time;
    float intensity = u_intensity;

    // --- Block displacement ---
    float blockSize = mix(0.05, 0.12, rand(vec2(floor(t * 4.0), 0.5)));
    vec2 blockUv = floor(uv / blockSize) * blockSize;
    float blockRand = rand(blockUv + vec2(t * 0.7));
    float blockRand2 = rand(blockUv + vec2(t * 1.3, 99.0));

    float glitchBand = step(0.94, rand(vec2(floor(uv.y * 30.0), floor(t * 8.0))));
    float glitchBand2 = step(0.97, rand(vec2(floor(uv.y * 80.0), floor(t * 15.0))));

    vec2 offset = vec2(0.0);
    offset.x += (blockRand - 0.5) * 0.08 * intensity * glitchBand;
    offset.x += (blockRand2 - 0.5) * 0.04 * intensity * glitchBand2;

    // --- Scanline roll ---
    float rollSpeed = mod(t * 0.3, 1.0);
    float roll = sin((uv.y + rollSpeed) * 3.14159 * 2.0 * 2.0) * 0.001 * intensity;
    offset.x += roll;

    // --- RGB split / chromatic aberration ---
    float chromaAmt = 0.008 * intensity;
    float chromaBurst = step(0.96, rand(vec2(floor(t*6.0), 1.1))) * 0.02 * intensity;
    float totalChroma = chromaAmt + chromaBurst;

    vec2 uvR = uv + offset + vec2(totalChroma, 0.0);
    vec2 uvG = uv + offset;
    vec2 uvB = uv + offset - vec2(totalChroma, 0.0);

    // flip x for front camera
    uvR.x = 1.0 - uvR.x;
    uvG.x = 1.0 - uvG.x;
    uvB.x = 1.0 - uvB.x;

    float r = texture2D(u_tex, clamp(uvR, 0.0, 1.0)).r;
    float g = texture2D(u_tex, clamp(uvG, 0.0, 1.0)).g;
    float b = texture2D(u_tex, clamp(uvB, 0.0, 1.0)).b;

    vec3 col = vec3(r, g, b);

    // --- Pixelate burst ---
    float pixBurst = step(0.98, rand(vec2(floor(t * 5.0), 3.7)));
    if (pixBurst > 0.5) {
      float ps = 0.03 * intensity;
      vec2 pxUv = floor(uv / ps) * ps;
      pxUv.x = 1.0 - pxUv.x;
      vec3 pixCol = texture2D(u_tex, clamp(pxUv, 0.0, 1.0)).rgb;
      col = mix(col, pixCol, 0.85);
    }

    // --- Vertical tear ---
    float tear = step(0.985, rand(vec2(floor(t * 12.0), 5.2)));
    if (tear > 0.5) {
      float tearY = rand(vec2(floor(t * 12.0), 11.0));
      float tearH = 0.003 + rand(vec2(floor(t * 12.0), 22.0)) * 0.01;
      if (uv.y > tearY && uv.y < tearY + tearH) {
        float dx = (rand(vec2(floor(t * 20.0), 33.0)) - 0.5) * 0.15 * intensity;
        vec2 tUv = vec2(1.0 - clamp(uv.x + dx, 0.0, 1.0), uv.y);
        col = texture2D(u_tex, tUv).rgb;
        col.r += 0.1; col.g -= 0.05;
      }
    }

    // --- Digital noise grain ---
    float grain = rand(uv + vec2(t * 0.01, t * 0.007)) * 0.12 * intensity;
    col += grain - 0.06;

    // --- Horizontal ghost lines ---
    float ghostLine = step(0.993, rand(vec2(floor(uv.y * 500.0), floor(t * 20.0))));
    col += ghostLine * vec3(0.0, 1.0, 0.4) * 0.4 * intensity;

    // --- Phosphor green tint on dark areas ---
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 tinted = mix(col, col * vec3(0.7, 1.1, 0.75), (1.0 - luma) * 0.15 * intensity);
    col = mix(col, tinted, 0.5);

    // --- Vhs color bleed ---
    float bleedAmt = 0.003 * intensity;
    vec2 bleedUv = vec2(1.0 - clamp(uv.x + bleedAmt * sin(uv.y * 100.0 + t * 3.0), 0.0, 1.0), uv.y);
    float bleedR = texture2D(u_tex, bleedUv).r;
    col.r = mix(col.r, bleedR, 0.15 * intensity);

    // --- Full frame white flash ---
    float flash = step(0.998, rand(vec2(floor(t * 30.0), 7.0))) * 0.6;
    col += flash;

    // --- Inversion burst (brief) ---
    float inv = step(0.999, rand(vec2(floor(t * 25.0), 8.0)));
    if (inv > 0.5) col = 1.0 - col;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`
};
