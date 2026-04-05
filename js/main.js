/* global AFRAME, THREE */
(function () {
  'use strict';

  AFRAME.registerComponent('hacked-portal', {
    schema: {
      intensity: { type: 'number', default: 1 },
      seed: { type: 'number', default: 0 }
    },

    init: function () {
      this.sceneEl = this.el;
      this.orthoScene = null;
      this.orthoCam = null;
      this.quad = null;
      this.mat = null;
      this.videoTex = null;
      this.videoEl = null;
      this.origRender = null;
      this.ready = false;

      var params = new URLSearchParams(window.location.search);
      var g = parseFloat(params.get('glitch'));
      var s = parseFloat(params.get('seed'));
      if (!isNaN(g)) {
        this.data.intensity = THREE.MathUtils.clamp(g, 0, 2);
      }
      if (!isNaN(s)) {
        this.data.seed = s;
      }

      var self = this;
      var start = function () {
        self.setupOrtho();
        self.waitVideoThenPatch();
      };
      if (this.sceneEl.hasLoaded) {
        start();
      } else {
        this.sceneEl.addEventListener('loaded', start);
      }
    },

    update: function (oldData) {
      if (!this.mat) return;
      if (oldData.intensity !== this.data.intensity) {
        this.mat.uniforms.uIntensity.value = this.data.intensity;
      }
      if (oldData.seed !== this.data.seed) {
        this.mat.uniforms.uSeed.value = this.data.seed;
      }
    },

    setupOrtho: function () {
      var shaders = window.HackedPortalShaders;
      if (!shaders) {
        console.error('HackedPortalShaders missing; load js/shaders.js first.');
        return;
      }

      this.orthoScene = new THREE.Scene();
      this.orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);

      var geo = new THREE.PlaneGeometry(2, 2, 48, 48);
      this.mat = new THREE.ShaderMaterial({
        uniforms: {
          uVideo: { value: null },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uIntensity: { value: this.data.intensity },
          uSeed: { value: this.data.seed }
        },
        vertexShader: shaders.vertex,
        fragmentShader: shaders.fragment,
        depthTest: false,
        depthWrite: false
      });

      this.quad = new THREE.Mesh(geo, this.mat);
      // Camera looks down -Z; place quad in front
      this.quad.position.z = -0.5;
      this.quad.frustumCulled = false;
      this.orthoScene.add(this.quad);
    },

    waitVideoThenPatch: function () {
      var self = this;
      var attempt = 0;

      function tryBind() {
        attempt += 1;
        var video =
          (self.sceneEl.querySelector && self.sceneEl.querySelector('video')) ||
          document.querySelector('a-scene video') ||
          document.querySelector('video');

        if (!video) {
          if (attempt < 600) {
            requestAnimationFrame(tryBind);
          }
          return;
        }

        function bind() {
          if (self.videoTex) {
            return;
          }
          var tex = new THREE.VideoTexture(video);
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          if ('colorSpace' in tex && THREE.SRGBColorSpace) {
            tex.colorSpace = THREE.SRGBColorSpace;
          } else if ('encoding' in tex && THREE.sRGBEncoding !== undefined) {
            tex.encoding = THREE.sRGBEncoding;
          }
          self.mat.uniforms.uVideo.value = tex;
          self.videoTex = tex;
          self.videoEl = video;
          self.patchRenderer();
          self.ready = true;
        }

        if (video.readyState >= 2) {
          bind();
        } else {
          video.addEventListener('loadeddata', bind, { once: true });
          video.addEventListener('canplay', bind, { once: true });
        }
      }

      tryBind();
    },

    patchRenderer: function () {
      var renderer = this.sceneEl.renderer;
      var self = this;
      if (this.origRender) {
        return;
      }
      this.origRender = renderer.render.bind(renderer);

      renderer.render = function (scene, camera) {
        var w = renderer.domElement.width;
        var h = renderer.domElement.height;
        if (self.mat) {
          self.mat.uniforms.uResolution.value.set(
            Math.max(1, w),
            Math.max(1, h)
          );
          self.mat.uniforms.uTime.value = performance.now() * 0.001;
          self.mat.uniforms.uIntensity.value = self.data.intensity;
          self.mat.uniforms.uSeed.value = self.data.seed;
        }
        if (self.videoTex && self.videoEl && self.videoEl.readyState >= 2) {
          self.videoTex.needsUpdate = true;
        }

        renderer.autoClear = false;
        renderer.clear(true, true, true);
        self.origRender(self.orthoScene, self.orthoCam);

        if (renderer.clearDepth) {
          renderer.clearDepth();
        } else {
          renderer.clear(false, true, false);
        }

        self.origRender(scene, camera);
      };
    },

    remove: function () {
      var renderer = this.sceneEl.renderer;
      if (this.origRender && renderer) {
        renderer.render = this.origRender;
        this.origRender = null;
      }
      if (this.videoTex) {
        this.videoTex.dispose();
        this.videoTex = null;
      }
      if (this.mat) {
        this.mat.dispose();
        this.mat = null;
      }
      if (this.quad && this.quad.geometry) {
        this.quad.geometry.dispose();
      }
    }
  });
})();
