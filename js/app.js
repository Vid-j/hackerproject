(function () {
  'use strict';

  const { vert: vertSrc, frag: fragSrc } = window.REALITY_SHADERS;

  let gl, program, texLoc, timeLoc, intensityLoc, resLoc;
  let videoEl, canvas;
  let texture;
  let running = false;
  let startTime;
  let intensity = 1.0;
  let targetIntensity = 1.0;

  function initAR() {
    document.getElementById('access-screen').style.display = 'none';
    videoEl = document.getElementById('video');
    canvas = document.getElementById('glitch-canvas');

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    })
      .then(stream => {
        videoEl.srcObject = stream;
        videoEl.play();
        videoEl.addEventListener('loadedmetadata', () => {
          initWebGL();
          startTime = performance.now();
          running = true;
          render();
          startGlitchEvents();
          tryGPS();
        });
      })
      .catch(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          .then(stream => {
            videoEl.srcObject = stream;
            videoEl.play();
            videoEl.addEventListener('loadedmetadata', () => {
              initWebGL();
              startTime = performance.now();
              running = true;
              render();
              startGlitchEvents();
              tryGPS();
            });
          })
          .catch(err => {
            document.getElementById('access-screen').style.display = 'flex';
            document.getElementById('access-title').textContent = 'CAM::DENIED';
            document.getElementById('access-sub').textContent = err.message;
          });
      });
  }

  function initWebGL() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertSrc);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragSrc);
    gl.compileShader(fs);

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    texLoc = gl.getUniformLocation(program, 'u_tex');
    timeLoc = gl.getUniformLocation(program, 'u_time');
    intensityLoc = gl.getUniformLocation(program, 'u_intensity');
    resLoc = gl.getUniformLocation(program, 'u_res');

    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    });
  }

  function render() {
    if (!running || !gl) return;
    requestAnimationFrame(render);

    if (videoEl.readyState < 2) return;

    intensity += (targetIntensity - intensity) * 0.05;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoEl);

    const t = (performance.now() - startTime) / 1000.0;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1i(texLoc, 0);
    gl.uniform1f(timeLoc, t);
    gl.uniform1f(intensityLoc, intensity);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function startGlitchEvents() {
    setInterval(() => {
      const dice = Math.random();
      if (dice < 0.15) {
        targetIntensity = 2.5 + Math.random() * 1.5;
        setTimeout(() => { targetIntensity = 0.8 + Math.random() * 0.4; }, 150 + Math.random() * 300);
      } else if (dice < 0.3) {
        targetIntensity = 0.2;
        setTimeout(() => { targetIntensity = 1.0; }, 80);
      }
    }, 800);

    setInterval(() => {
      document.getElementById('lat').textContent = (Math.random() * 180 - 90).toFixed(4);
      document.getElementById('lng').textContent = (Math.random() * 360 - 180).toFixed(4);
      document.getElementById('alt').textContent = Math.floor(Math.random() * 999) + 'M';
    }, 2000 + Math.random() * 3000);

    const msgs = [
      'SYS::OVERRIDE — SIGNAL COMPROMISED',
      'PERCEPTION_LAYER::CORRUPTED',
      'REALITY_INDEX::0.03',
      'SURFACE::DISSOLVING',
      'SHADER_CORE::ACTIVE',
      'HACK_STATUS::COMPLETE',
      'MEMBRANE::UNSTABLE',
      'GLITCH_ENGINE::v2.4.1'
    ];
    let mi = 0;
    setInterval(() => {
      mi = (mi + 1) % msgs.length;
      document.getElementById('status-bar').textContent = msgs[mi];
    }, 4000);
  }

  function tryGPS() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(pos => {
        document.getElementById('lat').textContent = pos.coords.latitude.toFixed(4);
        document.getElementById('lng').textContent = pos.coords.longitude.toFixed(4);
        document.getElementById('alt').textContent = pos.coords.altitude
          ? Math.round(pos.coords.altitude) + 'M'
          : '---M';
      });
    }
  }

  document.addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') targetIntensity = Math.min(3.0, targetIntensity + 0.2);
    if (e.key === '-') targetIntensity = Math.max(0.1, targetIntensity - 0.2);
    if (e.key === ' ') {
      targetIntensity = 3.5;
      setTimeout(() => { targetIntensity = 1.0; }, 500);
    }
  });

  document.addEventListener('touchstart', () => {
    targetIntensity = 3.0 + Math.random();
    setTimeout(() => { targetIntensity = 1.0; }, 400);
  });

  document.getElementById('access-btn').addEventListener('click', initAR);
})();
