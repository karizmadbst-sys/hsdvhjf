/**
 * ECHO – THE WORLD REMEMBERS
 * Cinematic Atmosphere, Sky Dome, Lighting Rig & Horizon Fog
 */

import * as THREE from 'three';

export class Atmosphere {
  public group: THREE.Group;
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  private fireflies: THREE.Points;
  private fireflyPositions: Float32Array;
  private fireflySpeeds: Float32Array;
  private fireflyCount: number = 380;
  private sceneRef: THREE.Scene;

  public applyQuality(shadows: boolean, shadowSize: number, fogDensity: number, maxParticles: number): void {
    this.dirLight.castShadow = shadows;
    if (shadows && this.dirLight.shadow.map) {
      this.dirLight.shadow.mapSize.width = shadowSize;
      this.dirLight.shadow.mapSize.height = shadowSize;
      this.dirLight.shadow.map.dispose();
      (this.dirLight.shadow as any).map = null;
    }

    if (this.sceneRef.fog && 'density' in this.sceneRef.fog) {
      (this.sceneRef.fog as THREE.FogExp2).density = fogDensity;
    }

    if (this.fireflies && this.fireflies.geometry) {
      const activeCount = Math.min(this.fireflyCount, maxParticles);
      this.fireflies.geometry.setDrawRange(0, activeCount);
    }
  }

  constructor(scene: THREE.Scene) {
    this.sceneRef = scene;
    this.group = new THREE.Group();

    // 1. Cinematic Horizon Fog (Matching twilight sky hue with expansive draw distance)
    const fogColor = new THREE.Color(0x0e1c2b);
    scene.fog = new THREE.FogExp2(fogColor, 0.0011);
    scene.background = fogColor;

    // 2. Vast Celestial Sky Dome with Stars & Nebula
    const skyGeo = new THREE.SphereGeometry(2200, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      map: this.createSkyTexture(),
      side: THREE.BackSide,
      fog: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.group.add(skyDome);

    // 3. Three-point Lighting Rig:
    // Warm key directional light (Sunset/Dusk golden rim) with mobile-optimized shadow frustum
    this.dirLight = new THREE.DirectionalLight(0xffdfba, 2.2);
    this.dirLight.position.set(-140, 140, -100);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 450;
    const d = 135;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0008;
    this.dirLight.shadow.normalBias = 0.03;
    this.group.add(this.dirLight);
    this.group.add(this.dirLight.target);

    // Cool celestial sky / warm ground HemisphereLight fill
    this.hemiLight = new THREE.HemisphereLight(0x2d5a88, 0x1a2e1d, 1.4);
    this.group.add(this.hemiLight);

    // Subtle soft rim backlight
    const rimLight = new THREE.DirectionalLight(0x40916c, 0.6);
    rimLight.position.set(160, 80, 140);
    this.group.add(rimLight);

    // Solid ambient baseline light
    const ambLight = new THREE.AmbientLight(0x4a6d8c, 1.2);
    this.group.add(ambLight);

    // 4. Continent-Wide Ambient Fireflies / Stardust Motes
    const fGeo = new THREE.BufferGeometry();
    this.fireflyCount = 380;
    this.fireflyPositions = new Float32Array(this.fireflyCount * 3);
    this.fireflySpeeds = new Float32Array(this.fireflyCount);

    for (let i = 0; i < this.fireflyCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 880;
      this.fireflyPositions[i * 3] = Math.cos(angle) * radius;
      this.fireflyPositions[i * 3 + 1] = 4 + Math.random() * 26;
      this.fireflyPositions[i * 3 + 2] = Math.sin(angle) * radius;
      this.fireflySpeeds[i] = 0.5 + Math.random() * 1.0;
    }

    fGeo.setAttribute('position', new THREE.BufferAttribute(this.fireflyPositions, 3));

    const fTexture = this.createFireflyTexture();
    const fMat = new THREE.PointsMaterial({
      size: 0.6,
      map: fTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x99ffe0,
    });

    this.fireflies = new THREE.Points(fGeo, fMat);
    this.group.add(this.fireflies);
  }

  private createSkyTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Gradient from deep space twilight down to dusk horizon
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#060a12');     // Deep void zenith
    grad.addColorStop(0.35, '#0b1624');  // Indigo dusk
    grad.addColorStop(0.7, '#11293e');   // Atmospheric cyan-navy
    grad.addColorStop(0.9, '#1a3b4f');   // Horizon glow
    grad.addColorStop(1, '#0e1c2b');     // Fog line

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Distant soft nebula cloud
    const neb = ctx.createRadialGradient(680, 180, 20, 680, 180, 240);
    neb.addColorStop(0, 'rgba(80, 180, 210, 0.35)');
    neb.addColorStop(0.5, 'rgba(120, 90, 200, 0.15)');
    neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, 1024, 512);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 750; s++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 380;
      const radius = Math.random() > 0.95 ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  private createFireflyTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(100, 255, 200, 0.8)');
    grad.addColorStop(0.7, 'rgba(50, 200, 150, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  private fireflyFrameCounter: number = 0;

  public update(time: number, playerPos?: THREE.Vector3): void {
    // Dynamically center directional shadow light over player position
    if (playerPos) {
      this.dirLight.position.set(playerPos.x - 120, playerPos.y + 130, playerPos.z - 80);
      this.dirLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
    }

    // Drifting fireflies (Throttle position buffer re-uploads to every 2nd frame for 50% CPU savings)
    this.fireflyFrameCounter++;
    if (this.fireflyFrameCounter % 2 === 0) {
      const pos = this.fireflies.geometry.attributes.position;
      const step = 2; // Stride for smooth low-overhead motes
      for (let i = 0; i < this.fireflyCount; i += step) {
        let y = pos.getY(i) + Math.sin(time * this.fireflySpeeds[i] + i) * 0.04;
        if (y < 2) y = 14;
        if (y > 35) y = 6;
        pos.setY(i, y);

        const x = pos.getX(i) + Math.cos(time * 0.5 + i) * 0.03;
        const z = pos.getZ(i) + Math.sin(time * 0.5 + i) * 0.03;
        pos.setX(i, x);
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }
  }
}
