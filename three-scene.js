import * as THREE from 'three';

class ThreeScene {
  constructor() {
    this.container = document.getElementById('three-container');
    this.canvas = document.getElementById('three-canvas');
    if (!this.canvas) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.coreGroup = null;
    this.meshCore = null;
    this.meshRing = null;
    this.particles = null;

    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    this.scrollProgress = 0;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.innerWidth <= 768;

    this.init();
  }

  init() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 7.5);

    // 3. Renderer with high performance & alpha
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 4. Lighting - Premium Studio Aesthetics
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.2); // Electric cyan key light
    dirLight1.position.set(5, 6, 4);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 1.8); // Violet rim light
    dirLight2.position.set(-5, -4, -2);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x00f2fe, 2.5, 12);
    pointLight.position.set(0, 0, 1.5);
    this.scene.add(pointLight);

    // 5. Core Geometry - Futuristic Floating Tech Relic
    this.coreGroup = new THREE.Group();
    this.scene.add(this.coreGroup);

    // Primary Core: Sculptural Torus Knot with metallic luxury material
    const knotGeo = new THREE.TorusKnotGeometry(1.05, 0.28, this.isMobile ? 100 : 180, 24, 2, 3);
    const knotMat = new THREE.MeshPhysicalMaterial({
      color: 0x182030,
      metalness: 0.85,
      roughness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.15,
      reflectivity: 0.9,
      transmission: 0.15,
      thickness: 0.8,
      wireframe: false,
    });
    this.meshCore = new THREE.Mesh(knotGeo, knotMat);
    this.coreGroup.add(this.meshCore);

    // Inner Glowing Polyhedron Nucleus
    const innerGeo = new THREE.IcosahedronGeometry(0.55, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    this.coreGroup.add(innerMesh);

    // Orbital Tech Ring 1
    const ringGeo1 = new THREE.TorusGeometry(2.1, 0.012, 16, this.isMobile ? 64 : 120);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    this.meshRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    this.meshRing1.rotation.x = Math.PI / 2.8;
    this.coreGroup.add(this.meshRing1);

    // Orbital Tech Ring 2
    const ringGeo2 = new THREE.TorusGeometry(2.35, 0.008, 16, this.isMobile ? 64 : 120);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xf5f5f7,
      transparent: true,
      opacity: 0.2,
    });
    this.meshRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    this.meshRing2.rotation.y = Math.PI / 3;
    this.coreGroup.add(this.meshRing2);

    // 6. Floating Ambient Particle Dust
    const particleCount = this.isMobile ? 180 : 450;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 16;
      positions[i + 1] = (Math.random() - 0.5) * 16;
      positions[i + 2] = (Math.random() - 0.5) * 12;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.024,
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particles);

    // Position group slightly offset on desktop for cinematic balance
    if (!this.isMobile) {
      this.coreGroup.position.set(1.6, 0.1, 0);
    } else {
      this.coreGroup.position.set(0, -0.6, -1);
      this.coreGroup.scale.setScalar(0.75);
    }

    // 7. Event Listeners
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));

    // 8. Start Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.isMobile = width <= 768;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));

    if (this.isMobile) {
      this.coreGroup.position.set(0, -0.6, -1);
      this.coreGroup.scale.setScalar(0.7);
    } else {
      this.coreGroup.position.set(1.6, 0.1, 0);
      this.coreGroup.scale.setScalar(1);
    }
  }

  onMouseMove(e) {
    if (this.isReducedMotion) return;
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = -(e.clientY / window.innerHeight) * 2 + 1;
    this.targetMouseX = normX * 0.45;
    this.targetMouseY = normY * 0.45;
  }

  setScrollProgress(progress) {
    this.scrollProgress = progress;
  }

  pulse() {
    if (!this.meshCore) return;
    const startScale = this.coreGroup.scale.x;
    let t = 0;
    const pulseAnim = () => {
      t += 0.08;
      const factor = 1 + Math.sin(t * Math.PI) * 0.18;
      this.coreGroup.scale.setScalar(startScale * factor);
      if (t < 1) {
        requestAnimationFrame(pulseAnim);
      } else {
        this.coreGroup.scale.setScalar(startScale);
      }
    };
    pulseAnim();
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Mouse Damping (Smooth camera tilt)
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.camera.position.x = this.mouseX;
    this.camera.position.y = this.mouseY;
    this.camera.lookAt(0, 0, 0);

    // Smooth Continuous Idle Rotation
    if (!this.isReducedMotion) {
      const rotSpeed = 0.005;
      this.meshCore.rotation.x += rotSpeed * 0.8;
      this.meshCore.rotation.y += rotSpeed;

      this.meshRing1.rotation.z += rotSpeed * 0.5;
      this.meshRing2.rotation.z -= rotSpeed * 0.4;

      if (this.particles) {
        this.particles.rotation.y += 0.0006;
      }
    }

    // Dynamic Scroll Synchronization:
    // Core responds to scroll, subtly drifting and scaling to harmonize with 300-frame video sequence
    const p = this.scrollProgress;
    if (!this.isMobile) {
      // Scene 0 (Hero): position on right
      // Scene 1 (Matrix): moves slightly back
      // Scene 2 (Vault): descends subtly
      // Scene 3 (Lab): centers as core reactor
      // Scene 4 (Education): ascends
      // Scene 5 (Contact): floats in cosmic distance
      this.coreGroup.position.x = 1.6 - p * 1.4;
      this.coreGroup.position.y = 0.1 + Math.sin(p * Math.PI * 2) * 0.5;
      this.coreGroup.position.z = -p * 2.2;
      
      // Modulate opacity and scale smoothly across scenes
      const targetScale = 1 - p * 0.35;
      this.coreGroup.scale.setScalar(Math.max(0.4, targetScale));
    }

    this.renderer.render(this.scene, this.camera);
  }
}

export const threeScene = new ThreeScene();
