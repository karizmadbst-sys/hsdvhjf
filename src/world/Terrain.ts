/**
 * ECHO – THE WORLD REMEMBERS
 * Procedural Island Terrain & Ocean
 * Generates continuous elevation, slopes, procedural ground texture, and ocean water.
 */

import * as THREE from 'three';

export interface TerrainHeights {
  getHeightAt(x: number, z: number): number;
  getNormalAt(x: number, z: number): THREE.Vector3;
}

export class Terrain {
  public mesh: THREE.Mesh;
  public oceanMesh: THREE.Mesh;
  public group: THREE.Group;
  private size: number = 2400;
  private segments: number = 200;
  private heightData: Float32Array;
  private oceanTexture!: THREE.CanvasTexture;

  // Island landmarks & Water Level
  public static readonly WATER_LEVEL = 1.6;
  public static readonly LAKE_CENTER = new THREE.Vector2(0, -15);
  public static readonly LAKE_RADIUS = 38;
  public static readonly LAKE_WATER_Y = 3.8;

  public static readonly TEMPLE_POS = new THREE.Vector3(-85, 14, 25);
  public static readonly PORTAL_POS = new THREE.Vector3(95, 16, -30);
  public static readonly SUMMIT_POS = new THREE.Vector3(15, 32, -100);
  public static readonly SPAWN_POS = new THREE.Vector3(0, 5, 80);

  constructor() {
    this.group = new THREE.Group();
    this.heightData = new Float32Array((this.segments + 1) * (this.segments + 1));

    // Create procedural ground texture
    const groundTexture = this.createGroundTexture();
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(64, 64);
    groundTexture.colorSpace = THREE.SRGBColorSpace;

    // Normal map for rock/grass bumps
    const groundNormal = this.createGroundNormalMap();
    groundNormal.wrapS = THREE.RepeatWrapping;
    groundNormal.wrapT = THREE.RepeatWrapping;
    groundNormal.repeat.set(96, 96);

    const terrainGeo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = this.calculateHeight(x, z);
      posAttr.setY(i, y);
      this.heightData[i] = y;
    }

    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      normalMap: groundNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughness: 0.82,
      metalness: 0.08,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.group.add(this.mesh);

    // Vast Realistic Blue Ocean plane
    const oceanGeo = new THREE.PlaneGeometry(4800, 4800, 32, 32);
    oceanGeo.rotateX(-Math.PI / 2);

    this.oceanTexture = this.createOceanTexture();
    this.oceanTexture.wrapS = THREE.RepeatWrapping;
    this.oceanTexture.wrapT = THREE.RepeatWrapping;
    this.oceanTexture.repeat.set(48, 48);
    this.oceanTexture.colorSpace = THREE.SRGBColorSpace;

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x087db2, // Vibrant sparkling azure blue
      roughness: 0.08,
      metalness: 0.45,
      transparent: true,
      opacity: 0.88,
      map: this.oceanTexture,
    });

    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.y = Terrain.WATER_LEVEL;
    this.oceanMesh.receiveShadow = true;
    this.group.add(this.oceanMesh);
  }

  /**
   * Continuous procedural height function for a vast, expansive continent.
   * Gives organic rolling hills, high mountain ridges, crater lake depression,
   * river valleys, coastal coves, and realistic shorelines.
   */
  public calculateHeight(x: number, z: number): number {
    const distFromCenter = Math.sqrt(x * x + z * z);
    const continentRadius = 1050; // Vast continent spanning over 2km across

    // Smooth coastal shoreline falloff into outer ocean only near edge
    let landMask = 1.0;
    if (distFromCenter > 880) {
      const t = (distFromCenter - 880) / (continentRadius - 880);
      landMask = Math.max(0, 1.0 - Math.min(1, t));
      landMask = landMask * landMask * (3 - 2 * landMask); // Smoothstep
    }
    if (distFromCenter >= continentRadius) return -3.5;

    // Multi-octave continuous mathematical terrain across the continent
    const h1 = Math.sin(x * 0.006) * Math.cos(z * 0.006) * 12.0;
    const h2 = Math.sin(x * 0.015 + 1.2) * Math.sin(z * 0.016 - 0.8) * 6.5;
    const h3 = Math.cos(x * 0.04) * Math.sin(z * 0.038) * 3.2;
    const h4 = (Math.sin(x * 0.09) + Math.cos(z * 0.09)) * 1.2;

    let baseElevation = (h1 + h2 + h3 + h4) * landMask + 6.0 * landMask;

    // 1. The Great Northern Mountain Range & Alpine Crags (z: -70 to -650)
    const northDist = Math.sqrt((x - 15) * (x - 15) + (z + 180) * (z + 180));
    if (northDist < 260) {
      const mountainFalloff = Math.max(0, 1 - northDist / 260);
      const mPeak = Math.pow(mountainFalloff, 2.0) * 36.0;
      const ridgeNoise = Math.sin(x * 0.035) * Math.cos(z * 0.03) * 7.5 * mountainFalloff;
      baseElevation += mPeak + ridgeNoise;
    }

    // High Summit Landmark (15, 32, -100)
    const summitDist = Math.sqrt((x - Terrain.SUMMIT_POS.x) ** 2 + (z - Terrain.SUMMIT_POS.z) ** 2);
    if (summitDist < 75) {
      const sFactor = Math.max(0, 1 - summitDist / 75);
      baseElevation += Math.pow(sFactor, 1.8) * 16.0;
    }

    // 2. Eastern Portal Cliff & Highland Plateau (x: 80 to 450, z: -100 to 180)
    const portalDist = Math.sqrt((x - Terrain.PORTAL_POS.x) ** 2 + (z - Terrain.PORTAL_POS.z) ** 2);
    if (portalDist < 55) {
      const cliffFactor = Math.max(0, 1 - portalDist / 55);
      baseElevation += Math.pow(cliffFactor, 1.8) * 11.0;
    }

    // Eastern Windmill Ridges
    const eastDist = Math.sqrt((x - 260) ** 2 + (z - 40) ** 2);
    if (eastDist < 210) {
      const eFactor = Math.max(0, 1 - eastDist / 210);
      baseElevation += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 8.0 * eFactor + eFactor * 10.0;
    }

    // 3. Western Temple Plateau & Deep Woods (x: -50 to -450, z: -120 to 180)
    const templeDist = Math.sqrt((x - Terrain.TEMPLE_POS.x) ** 2 + (z - Terrain.TEMPLE_POS.z) ** 2);
    if (templeDist < 50) {
      const templeFactor = Math.max(0, 1 - templeDist / 50);
      baseElevation += Math.pow(templeFactor, 1.5) * 8.5;
    }

    const westRidgeDist = Math.sqrt((x + 240) ** 2 + (z + 40) ** 2);
    if (westRidgeDist < 190) {
      const wFactor = Math.max(0, 1 - westRidgeDist / 190);
      baseElevation += Math.cos(x * 0.025) * Math.sin(z * 0.02) * 7.0 * wFactor + wFactor * 9.0;
    }

    // 4. Central Crater for the Bioluminescent Lake
    const lakeDist = Math.sqrt((x - Terrain.LAKE_CENTER.x) ** 2 + (z - Terrain.LAKE_CENTER.y) ** 2);
    if (lakeDist < Terrain.LAKE_RADIUS + 25) {
      const factor = Math.max(0, 1 - lakeDist / (Terrain.LAKE_RADIUS + 25));
      // Depression down below water level
      const depth = Math.pow(factor, 1.4) * 6.5;
      baseElevation -= depth;
    }

    // 5. South-Western Natural Sea Fjord / River Channel (x: -90 to -240, z: 120 to 320)
    // Creates a scenic fjord channel where sea enters land, creating swimming bays
    const fjordU = (x + 150) * 0.015;
    const fjordV = (z - 220) * 0.015;
    const fjordDist = Math.sqrt(fjordU * fjordU + fjordV * fjordV);
    if (fjordDist < 1.4) {
      const fFactor = Math.cos(fjordDist * (Math.PI / 2.8));
      if (fFactor > 0) {
        baseElevation -= Math.pow(fFactor, 1.5) * 7.5;
      }
    }

    // Ensure land stays comfortably above water inside continent, dropping smoothly to sea
    if (distFromCenter < 880) {
      return Math.max(0.6, baseElevation);
    }

    // Outer shoreline drops under the sea level (1.6) down to sea bed (-3.5)
    return THREE.MathUtils.lerp(Math.max(0.6, baseElevation), -3.5, 1.0 - landMask);
  }

  public floorHeightProvider: ((x: number, z: number) => number | null) | null = null;

  /**
   * Returns whether a given coordinate is in water (elevation below water line)
   */
  public isWaterAt(x: number, z: number): boolean {
    return this.getHeightAt(x, z) < Terrain.WATER_LEVEL;
  }

  /**
   * Returns water depth at (x, z)
   */
  public getWaterDepthAt(x: number, z: number): number {
    const h = this.getHeightAt(x, z);
    return Math.max(0, Terrain.WATER_LEVEL - h);
  }

  /**
   * Returns exact elevation at any world (x, z)
   */
  public getHeightAt(x: number, z: number): number {
    if (this.floorHeightProvider) {
      const floorH = this.floorHeightProvider(x, z);
      if (floorH !== null) return floorH;
    }
    return this.calculateHeight(x, z);
  }

  /**
   * Computes the slope normal at (x, z)
   */
  public getNormalAt(x: number, z: number): THREE.Vector3 {
    if (this.floorHeightProvider && this.floorHeightProvider(x, z) !== null) {
      return new THREE.Vector3(0, 1, 0);
    }
    const eps = 0.5;
    const hL = this.calculateHeight(x - eps, z);
    const hR = this.calculateHeight(x + eps, z);
    const hD = this.calculateHeight(x, z - eps);
    const hU = this.calculateHeight(x, z + eps);

    const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU);
    normal.normalize();
    return normal;
  }

  /**
   * High-performance GPU wave and water caustics animation with zero CPU vertex buffer re-uploads
   */
  public update(time: number): void {
    if (this.oceanTexture) {
      this.oceanTexture.offset.x = (time * 0.012) % 1;
      this.oceanTexture.offset.y = (time * 0.008) % 1;
    }
    // Subtle organic sea level breathing
    this.oceanMesh.position.y = Terrain.WATER_LEVEL + Math.sin(time * 0.85) * 0.07;
  }

  /**
   * Procedural texture with grass, moss, rock strata, and golden sand
   */
  private createGroundTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base deep emerald-moss green
    ctx.fillStyle = '#263b27';
    ctx.fillRect(0, 0, 1024, 1024);

    // Speckle grass blades and soil patches
    for (let i = 0; i < 24000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = Math.random();

      if (r < 0.4) {
        ctx.fillStyle = '#3a5732'; // Fresh green
      } else if (r < 0.7) {
        ctx.fillStyle = '#1e2e1e'; // Dark damp loam
      } else if (r < 0.9) {
        ctx.fillStyle = '#4c6b41'; // Vibrant moss
      } else {
        ctx.fillStyle = '#7a7b5a'; // Slate stone pebble
      }

      const w = 1 + Math.random() * 3;
      const h = 1 + Math.random() * 4;
      ctx.fillRect(x, y, w, h);
    }

    // Mystical faint ancient glyph trails
    ctx.strokeStyle = 'rgba(78, 175, 145, 0.12)';
    ctx.lineWidth = 3;
    for (let j = 0; j < 12; j++) {
      ctx.beginPath();
      const sx = Math.random() * 1024;
      const sy = Math.random() * 1024;
      ctx.arc(sx, sy, 40 + Math.random() * 80, 0, Math.PI * 1.5);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Procedural bump/normal map
   */
  private createGroundNormalMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const imgData = ctx.createImageData(512, 512);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const nx = 128 + Math.floor((Math.random() - 0.5) * 45);
      const ny = 128 + Math.floor((Math.random() - 0.5) * 45);
      data[i] = nx;
      data[i + 1] = ny;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Procedural realistic azure-blue ocean texture with caustics, sun glints, and white sea foam
   */
  private createOceanTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Rich deep sapphire-azure base gradient
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#005b8e');
    grad.addColorStop(0.5, '#0077b6');
    grad.addColorStop(1, '#0096c7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Turquoise caustics network
    ctx.strokeStyle = 'rgba(72, 202, 228, 0.42)';
    ctx.lineWidth = 2.0;

    for (let i = 0; i < 900; i++) {
      ctx.beginPath();
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = 12 + Math.random() * 32;
      ctx.ellipse(x, y, r, r * 0.48, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Sparkling sun highlights & fine foam streaks
    ctx.fillStyle = 'rgba(202, 240, 248, 0.55)';
    for (let j = 0; j < 1200; j++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = 1.2 + Math.random() * 2.8;
      ctx.fillRect(x, y, size, size);
    }

    // Delicate wave crest lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 120; k++) {
      ctx.beginPath();
      const sx = Math.random() * 1024;
      const sy = Math.random() * 1024;
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + 20 + Math.random() * 30, sy + (Math.random() - 0.5) * 15,
        sx + 50 + Math.random() * 40, sy + (Math.random() - 0.5) * 20,
        sx + 90 + Math.random() * 50, sy + (Math.random() - 0.5) * 15
      );
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }
}

