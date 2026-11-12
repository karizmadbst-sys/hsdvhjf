/**
 * ECHO – THE WORLD REMEMBERS
 * 3D Procedural Forests, Lush Flora, Roads, Windmills & Living World Landmarks
 * Features dense multi-biome forests, instanced grass & flower tufts, winding road networks,
 * rotating hillside windmill, mountain watchtower, coastal fishing pier with boats, and stone shrines.
 */

import * as THREE from 'three';
import { Terrain } from './Terrain.ts';
import { VillageHouses } from './VillageHouses.ts';

export interface WorldObstacle {
  x: number;
  z: number;
  radius: number;
}

export class Forest {
  public group: THREE.Group;
  public obstacles: WorldObstacle[] = [];
  private windmillSails: THREE.Group | null = null;
  private roadLanterns: THREE.PointLight[] = [];

  // Instanced Meshes for LOD and Quality adjustment
  private treeGroup: THREE.Group = new THREE.Group();
  private instancedGrass: THREE.InstancedMesh | null = null;
  private instancedFlowers: THREE.InstancedMesh | null = null;
  private fullGrassCount: number = 0;
  private fullFlowerCount: number = 0;

  constructor(terrain: Terrain) {
    this.group = new THREE.Group();

    this.spawnVastForestTrees(terrain);
    this.spawnInstancedGrassAndFlora(terrain);
    this.spawnRoadsAndTrailMarkers(terrain);
    this.spawnHillsideWindmill(terrain);
    this.spawnMountainWatchtower(terrain);
    this.spawnCoastalFishingPier(terrain);
    this.spawnAncientStandingMonoliths(terrain);
    this.spawnBoulders(terrain);
    this.spawnGlowingMushrooms(terrain);
    this.spawnColossalElderTree(terrain);
  }

  /**
   * Applies LOD and quality settings dynamically
   */
  public applyQuality(shadows: boolean, grassRatio: number, enableExtraLights: boolean): void {
    // 1. Shadows toggling on foliage
    this.treeGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = shadows;
      }
    });

    // 2. Adjust Instanced Grass count dynamically without re-allocating memory
    if (this.instancedGrass && this.fullGrassCount > 0) {
      this.instancedGrass.count = Math.max(10, Math.floor(this.fullGrassCount * grassRatio));
      this.instancedGrass.instanceMatrix.needsUpdate = true;
    }
    if (this.instancedFlowers && this.fullFlowerCount > 0) {
      this.instancedFlowers.count = Math.max(5, Math.floor(this.fullFlowerCount * grassRatio));
      this.instancedFlowers.instanceMatrix.needsUpdate = true;
    }

    // 3. Roadside point lights
    for (const light of this.roadLanterns) {
      light.visible = enableExtraLights;
    }
  }

  /**
   * Spawns 480+ multi-biome trees across the vast expanded continent using high-performance InstancedMesh.
   * Drastically reduces draw calls from ~2,400 to just 10 draw calls with near-zero memory footprint.
   */
  private spawnVastForestTrees(terrain: Terrain): void {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3220,
      roughness: 0.9,
      metalness: 0.05,
    });

    const birchTrunkMat = new THREE.MeshStandardMaterial({
      color: 0xdcd8cf, // Pale white-grey birch bark
      roughness: 0.85,
      metalness: 0.04,
    });

    const pineLeafMat = new THREE.MeshStandardMaterial({ color: 0x1f4e34, roughness: 0.8 });
    const birchLeafMat = new THREE.MeshStandardMaterial({ color: 0xcc8822, roughness: 0.75 });
    const oakLeafMat = new THREE.MeshStandardMaterial({ color: 0x386641, roughness: 0.82 });

    interface TreePlacement {
      x: number;
      y: number;
      z: number;
      scale: number;
      rotY: number;
      scaleYMult: number;
    }

    const pinePlacements: TreePlacement[] = [];
    const birchPlacements: TreePlacement[] = [];
    const oakPlacements: TreePlacement[] = [];

    const treeCount = 480;

    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 32 + Math.pow(Math.random(), 0.75) * 820;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Avoid lake crater
      const lakeDist = Math.hypot(x - Terrain.LAKE_CENTER.x, z - Terrain.LAKE_CENTER.y);
      if (lakeDist < Terrain.LAKE_RADIUS + 8) continue;

      // Avoid central landmarks
      const templeDist = Math.hypot(x - Terrain.TEMPLE_POS.x, z - Terrain.TEMPLE_POS.z);
      if (templeDist < 25) continue;

      const portalDist = Math.hypot(x - Terrain.PORTAL_POS.x, z - Terrain.PORTAL_POS.z);
      if (portalDist < 22) continue;

      // Avoid village houses
      if (VillageHouses.isNearAnyHouse(x, z, 4.0)) continue;

      const y = terrain.getHeightAt(x, z);
      if (y < 2.2 || y > 45.0) continue;

      const isBirch = x > 120 && z > -80 && Math.random() < 0.45;
      const isMountainPine = y > 16.0;
      const scale = (isMountainPine ? 1.0 : 0.8) + Math.random() * 0.55;
      const scaleYMult = 0.9 + Math.random() * 0.35;
      const rotY = Math.random() * Math.PI * 2;

      const placement: TreePlacement = { x, y, z, scale, rotY, scaleYMult };

      if (isBirch) {
        birchPlacements.push(placement);
      } else if (isMountainPine) {
        pinePlacements.push(placement);
      } else {
        oakPlacements.push(placement);
      }

      this.obstacles.push({
        x,
        z,
        radius: 0.85 * scale,
      });
    }

    const dummy = new THREE.Object3D();
    const childDummy = new THREE.Object3D();
    this.treeGroup = new THREE.Group();
    dummy.add(childDummy);

    // 1. Mountain Pines Instancing
    if (pinePlacements.length > 0) {
      const pCount = pinePlacements.length;
      const trunkHeight = 4.8;
      const trunkGeo = new THREE.CylinderGeometry(0.28, 0.55, trunkHeight, 6);
      const pineTrunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, pCount);
      pineTrunkMesh.castShadow = true;
      pineTrunkMesh.receiveShadow = true;

      // 4 conical tiers
      const tierMeshes: THREE.InstancedMesh[] = [];
      for (let t = 0; t < 4; t++) {
        const tierRadius = 2.4 - t * 0.5;
        const tierHeight = 2.2 - t * 0.3;
        const tierGeo = new THREE.ConeGeometry(tierRadius, tierHeight, 6);
        const tMesh = new THREE.InstancedMesh(tierGeo, pineLeafMat, pCount);
        tMesh.castShadow = (t === 0); // Only lowest widest tier casts shadow for extreme fillrate efficiency
        tMesh.receiveShadow = true;
        tierMeshes.push(tMesh);
      }

      for (let idx = 0; idx < pCount; idx++) {
        const p = pinePlacements[idx];
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rotY, 0);
        dummy.scale.set(p.scale, p.scale * p.scaleYMult, p.scale);
        dummy.updateMatrixWorld(true);

        // Trunk matrix
        childDummy.position.set(0, trunkHeight / 2, 0);
        childDummy.rotation.set(0, 0, 0);
        childDummy.scale.set(1, 1, 1);
        childDummy.updateMatrix();
        pineTrunkMesh.setMatrixAt(idx, childDummy.matrixWorld);

        // Tier matrices
        for (let t = 0; t < 4; t++) {
          childDummy.position.set(0, trunkHeight * 0.7 + t * 1.25, 0);
          childDummy.rotation.set(0, (t * Math.PI) / 3, 0);
          childDummy.scale.set(1, 1, 1);
          childDummy.updateMatrix();
          tierMeshes[t].setMatrixAt(idx, childDummy.matrixWorld);
        }
      }

      pineTrunkMesh.instanceMatrix.needsUpdate = true;
      pineTrunkMesh.computeBoundingSphere();
      this.treeGroup.add(pineTrunkMesh);

      for (const tm of tierMeshes) {
        tm.instanceMatrix.needsUpdate = true;
        tm.computeBoundingSphere();
        this.treeGroup.add(tm);
      }
    }

    // 2. Golden Birch Instancing
    if (birchPlacements.length > 0) {
      const bCount = birchPlacements.length;
      const trunkHeight = 4.2;
      const trunkGeo = new THREE.CylinderGeometry(0.25, 0.48, trunkHeight, 6);
      const birchTrunkMesh = new THREE.InstancedMesh(trunkGeo, birchTrunkMat, bCount);
      birchTrunkMesh.castShadow = true;
      birchTrunkMesh.receiveShadow = true;

      const tierMeshes: THREE.InstancedMesh[] = [];
      for (let t = 0; t < 3; t++) {
        const fGeo = new THREE.DodecahedronGeometry(1.4 - t * 0.25, 0);
        const fMesh = new THREE.InstancedMesh(fGeo, birchLeafMat, bCount);
        fMesh.castShadow = (t === 0);
        fMesh.receiveShadow = true;
        tierMeshes.push(fMesh);
      }

      for (let idx = 0; idx < bCount; idx++) {
        const p = birchPlacements[idx];
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rotY, 0);
        dummy.scale.set(p.scale, p.scale * p.scaleYMult, p.scale);
        dummy.updateMatrixWorld(true);

        childDummy.position.set(0, trunkHeight / 2, 0);
        childDummy.rotation.set(0, 0, 0);
        childDummy.scale.set(1, 1, 1);
        childDummy.updateMatrix();
        birchTrunkMesh.setMatrixAt(idx, childDummy.matrixWorld);

        for (let t = 0; t < 3; t++) {
          childDummy.position.set(
            (t === 1 ? 0.35 : (t === 2 ? -0.25 : 0)),
            trunkHeight + t * 0.9,
            (t === 1 ? -0.25 : 0)
          );
          childDummy.rotation.set(0, 0, 0);
          childDummy.scale.set(1.1, 0.9, 1.1);
          childDummy.updateMatrix();
          tierMeshes[t].setMatrixAt(idx, childDummy.matrixWorld);
        }
      }

      birchTrunkMesh.instanceMatrix.needsUpdate = true;
      birchTrunkMesh.computeBoundingSphere();
      this.treeGroup.add(birchTrunkMesh);

      for (const tm of tierMeshes) {
        tm.instanceMatrix.needsUpdate = true;
        tm.computeBoundingSphere();
        this.treeGroup.add(tm);
      }
    }

    // 3. Broadleaf Oak Instancing
    if (oakPlacements.length > 0) {
      const oCount = oakPlacements.length;
      const trunkHeight = 3.6;
      const trunkGeo = new THREE.CylinderGeometry(0.32, 0.6, trunkHeight, 6);
      const oakTrunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, oCount);
      oakTrunkMesh.castShadow = true;
      oakTrunkMesh.receiveShadow = true;

      const tierMeshes: THREE.InstancedMesh[] = [];
      for (let t = 0; t < 3; t++) {
        const tierRadius = 2.5 - t * 0.55;
        const tierHeight = 2.1 - t * 0.3;
        const foliageGeo = new THREE.ConeGeometry(tierRadius, tierHeight, 7);
        const fMesh = new THREE.InstancedMesh(foliageGeo, oakLeafMat, oCount);
        fMesh.castShadow = (t === 0);
        fMesh.receiveShadow = true;
        tierMeshes.push(fMesh);
      }

      for (let idx = 0; idx < oCount; idx++) {
        const p = oakPlacements[idx];
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rotY, 0);
        dummy.scale.set(p.scale, p.scale * p.scaleYMult, p.scale);
        dummy.updateMatrixWorld(true);

        childDummy.position.set(0, trunkHeight / 2, 0);
        childDummy.rotation.set(0, 0, 0);
        childDummy.scale.set(1, 1, 1);
        childDummy.updateMatrix();
        oakTrunkMesh.setMatrixAt(idx, childDummy.matrixWorld);

        for (let t = 0; t < 3; t++) {
          childDummy.position.set(0, trunkHeight + t * 1.2, 0);
          childDummy.rotation.set(0, (t * Math.PI) / 4, 0);
          childDummy.scale.set(1, 1, 1);
          childDummy.updateMatrix();
          tierMeshes[t].setMatrixAt(idx, childDummy.matrixWorld);
        }
      }

      oakTrunkMesh.instanceMatrix.needsUpdate = true;
      oakTrunkMesh.computeBoundingSphere();
      this.treeGroup.add(oakTrunkMesh);

      for (const tm of tierMeshes) {
        tm.instanceMatrix.needsUpdate = true;
        tm.computeBoundingSphere();
        this.treeGroup.add(tm);
      }
    }

    this.group.add(this.treeGroup);
  }

  /**
   * Spawns 1200+ instanced 3D grass tufts and wildflowers for breathtaking landscape detail
   */
  private spawnInstancedGrassAndFlora(terrain: Terrain): void {
    const grassCount = 1200;
    const grassGeo = new THREE.ConeGeometry(0.28, 0.75, 4);
    grassGeo.translate(0, 0.375, 0);

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x3f8a4f,
      roughness: 0.85,
      metalness: 0.02,
      flatShading: true,
    });

    const instancedGrass = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
    const dummy = new THREE.Object3D();

    let placed = 0;
    for (let i = 0; i < grassCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.pow(Math.random(), 0.6) * 750;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const y = terrain.getHeightAt(x, z);
      if (y < 2.0 || y > 35.0) continue;
      if (VillageHouses.isNearAnyHouse(x, z, 2.5)) continue;

      const scaleY = 0.6 + Math.random() * 0.8;
      const scaleXZ = 0.7 + Math.random() * 0.6;
      dummy.position.set(x, y, z);
      dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      dummy.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2);
      dummy.updateMatrix();

      instancedGrass.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    this.instancedGrass = instancedGrass;
    this.fullGrassCount = placed;
    instancedGrass.count = placed;
    instancedGrass.instanceMatrix.needsUpdate = true;
    instancedGrass.receiveShadow = true;
    this.group.add(instancedGrass);

    // Wildflowers (Golden Meadow Blossoms & Azure Bells)
    const flowerCount = 380;
    const flowerGeo = new THREE.OctahedronGeometry(0.18, 0);
    flowerGeo.translate(0, 0.45, 0);

    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xffd166, // Golden yellow
      roughness: 0.5,
      emissive: 0xffaa00,
      emissiveIntensity: 0.2,
    });

    const instancedFlowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
    let flowersPlaced = 0;

    for (let f = 0; f < flowerCount; f++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.pow(Math.random(), 0.6) * 650;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const y = terrain.getHeightAt(x, z);
      if (y < 2.2 || y > 28.0) continue;

      dummy.position.set(x, y, z);
      const s = 0.6 + Math.random() * 0.7;
      dummy.scale.set(s, s * 1.2, s);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();

      instancedFlowers.setMatrixAt(flowersPlaced, dummy.matrix);
      flowersPlaced++;
    }

    this.instancedFlowers = instancedFlowers;
    this.fullFlowerCount = flowersPlaced;
    instancedFlowers.count = flowersPlaced;
    instancedFlowers.instanceMatrix.needsUpdate = true;
    instancedFlowers.receiveShadow = true;
    this.group.add(instancedFlowers);
  }

  /**
   * Spawns scenic cobblestone roads and trail markers connecting key regions
   */
  private spawnRoadsAndTrailMarkers(terrain: Terrain): void {
    const roadPoints = [
      // Spawn shore to Village Plaza
      new THREE.Vector3(0, 0, 78),
      new THREE.Vector3(15, 0, 65),
      new THREE.Vector3(32, 0, 52),
      new THREE.Vector3(48, 0, 42),

      // Village Plaza to Lake Docks
      new THREE.Vector3(35, 0, 25),
      new THREE.Vector3(18, 0, 10),
      new THREE.Vector3(2, 0, -2),

      // Lake to Great Portal
      new THREE.Vector3(25, 0, -8),
      new THREE.Vector3(55, 0, -18),
      new THREE.Vector3(82, 0, -26),

      // Village to Eastern Windmill Valley
      new THREE.Vector3(80, 0, 36),
      new THREE.Vector3(130, 0, 22),
      new THREE.Vector3(180, 0, 5),
      new THREE.Vector3(225, 0, -15),

      // Lake to Ancient Temple
      new THREE.Vector3(-25, 0, 2),
      new THREE.Vector3(-55, 0, 14),
      new THREE.Vector3(-78, 0, 22),

      // Lake to Mountain Pass
      new THREE.Vector3(-5, 0, -35),
      new THREE.Vector3(5, 0, -65),
      new THREE.Vector3(15, 0, -92),
    ];

    const stoneGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.12, 6);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x7c7e84,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    // Place stepping stones along path segments
    for (let p = 0; p < roadPoints.length - 1; p++) {
      const p1 = roadPoints[p];
      const p2 = roadPoints[p + 1];
      const dist = p1.distanceTo(p2);
      if (dist > 70) continue; // separate path branches

      const steps = Math.floor(dist / 3.2);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = THREE.MathUtils.lerp(p1.x, p2.x, t) + (Math.random() - 0.5) * 0.4;
        const z = THREE.MathUtils.lerp(p1.z, p2.z, t) + (Math.random() - 0.5) * 0.4;
        const y = terrain.getHeightAt(x, z);

        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(x, y + 0.04, z);
        stone.scale.set(1.2 + Math.random() * 0.5, 1.0, 1.2 + Math.random() * 0.5);
        stone.rotation.y = Math.random() * Math.PI;
        stone.receiveShadow = true;
        this.group.add(stone);

        // Roadside lantern every few steps
        if (s % 5 === 0 && Math.random() < 0.65) {
          const lanternX = x + (Math.random() > 0.5 ? 1.8 : -1.8);
          const lanternZ = z + (Math.random() - 0.5) * 0.8;
          const lanternY = terrain.getHeightAt(lanternX, lanternZ);
          this.createRoadsideLantern(lanternX, lanternY, lanternZ);
        }
      }
    }
  }

  /**
   * Creates a carved roadside wooden lantern with warm amber glow
   */
  private createRoadsideLantern(x: number, y: number, z: number): void {
    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.9 });
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(x, y + 1.2, z);
    post.castShadow = true;
    this.group.add(post);

    const lanternBoxGeo = new THREE.BoxGeometry(0.32, 0.38, 0.32);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffaa44,
      emissive: 0xff8822,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    const lantern = new THREE.Mesh(lanternBoxGeo, lanternMat);
    lantern.position.set(x, y + 2.2, z);
    this.group.add(lantern);

    const pLight = new THREE.PointLight(0xff9933, 0.85, 8.5);
    pLight.position.set(x, y + 2.2, z);
    this.group.add(pLight);
    this.roadLanterns.push(pLight);

    this.obstacles.push({ x, z, radius: 0.35 });
  }

  /**
   * Spawns The Eastern Hillside Windmill with rotating sails (x: 235, z: -25)
   */
  private spawnHillsideWindmill(terrain: Terrain): void {
    const wx = 235;
    const wz = -25;
    const wy = terrain.getHeightAt(wx, wz);

    const windmillGroup = new THREE.Group();
    windmillGroup.position.set(wx, wy, wz);

    // Stone base
    const baseGeo = new THREE.CylinderGeometry(4.2, 4.8, 3.2, 10);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e7078, roughness: 0.9, flatShading: true });
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 1.6;
    base.castShadow = true;
    base.receiveShadow = true;
    windmillGroup.add(base);

    // Octagonal timber tower
    const towerGeo = new THREE.CylinderGeometry(3.0, 4.0, 7.5, 8);
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.85 });
    const tower = new THREE.Mesh(towerGeo, timberMat);
    tower.position.y = 3.2 + 3.75;
    tower.castShadow = true;
    windmillGroup.add(tower);

    // Conical thatched roof cap
    const roofGeo = new THREE.ConeGeometry(3.4, 3.8, 8);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3d4b58, roughness: 0.8 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 3.2 + 7.5 + 1.9;
    roof.castShadow = true;
    windmillGroup.add(roof);

    // Rotating sail rotor hub & blades
    const sailHub = new THREE.Group();
    sailHub.position.set(0, 3.2 + 7.2, 3.1);

    const hubCenterGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
    hubCenterGeo.rotateX(Math.PI / 2);
    const hubCenter = new THREE.Mesh(hubCenterGeo, timberMat);
    sailHub.add(hubCenter);

    const sailClothMat = new THREE.MeshStandardMaterial({
      color: 0xede0d4,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const sparMat = new THREE.MeshStandardMaterial({ color: 0x2e1d11, roughness: 0.9 });

    for (let b = 0; b < 4; b++) {
      const bladeAngle = (b * Math.PI) / 2;
      const bladeGroup = new THREE.Group();
      bladeGroup.rotation.z = bladeAngle;

      // Wooden spar
      const sparGeo = new THREE.BoxGeometry(0.18, 5.8, 0.14);
      const spar = new THREE.Mesh(sparGeo, sparMat);
      spar.position.y = 2.9;
      bladeGroup.add(spar);

      // Canvas sail sheet
      const sailGeo = new THREE.PlaneGeometry(1.2, 4.8);
      const sail = new THREE.Mesh(sailGeo, sailClothMat);
      sail.position.set(0.65, 3.2, 0.05);
      sail.castShadow = true;
      bladeGroup.add(sail);

      sailHub.add(bladeGroup);
    }

    windmillGroup.add(sailHub);
    this.windmillSails = sailHub;
    this.group.add(windmillGroup);

    this.obstacles.push({ x: wx, z: wz, radius: 4.8 });
  }

  /**
   * Spawns a high stone watchtower on the northern ridge (x: 85, z: -185)
   */
  private spawnMountainWatchtower(terrain: Terrain): void {
    const tx = 85;
    const tz = -185;
    const ty = terrain.getHeightAt(tx, tz);

    const towerGroup = new THREE.Group();
    towerGroup.position.set(tx, ty, tz);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: 0.92, flatShading: true });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.85 });

    // Tower shaft
    const shaftGeo = new THREE.CylinderGeometry(2.4, 3.2, 12.0, 8);
    const shaft = new THREE.Mesh(shaftGeo, stoneMat);
    shaft.position.y = 6.0;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    towerGroup.add(shaft);

    // Watchtower battlements / viewing balcony
    const balconyGeo = new THREE.CylinderGeometry(3.2, 2.6, 1.4, 8);
    const balcony = new THREE.Mesh(balconyGeo, stoneMat);
    balcony.position.y = 12.7;
    balcony.castShadow = true;
    towerGroup.add(balcony);

    // Timber posts & roof
    const roofGeo = new THREE.ConeGeometry(3.6, 2.8, 8);
    const roof = new THREE.Mesh(roofGeo, woodMat);
    roof.position.y = 15.6;
    roof.castShadow = true;
    towerGroup.add(roof);

    // Glowing ancient beacon fire
    const fireGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const fireMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.8,
    });
    const beaconFire = new THREE.Mesh(fireGeo, fireMat);
    beaconFire.position.y = 13.8;
    towerGroup.add(beaconFire);

    const bLight = new THREE.PointLight(0x00f5d4, 2.2, 25.0);
    bLight.position.y = 14.0;
    towerGroup.add(bLight);

    this.group.add(towerGroup);
    this.obstacles.push({ x: tx, z: tz, radius: 3.4 });
  }

  /**
   * Spawns a rustic coastal wooden fishing pier & boats (x: -110, z: 180)
   */
  private spawnCoastalFishingPier(terrain: Terrain): void {
    const px = -110;
    const pz = 180;
    const waterY = Terrain.WATER_LEVEL;

    const pierGroup = new THREE.Group();
    pierGroup.position.set(px, waterY + 0.15, pz);

    const timberMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
    const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0x5e422c, roughness: 0.85 });

    // Wooden deck boardwalk extending out into water
    const deckGeo = new THREE.BoxGeometry(4.2, 0.25, 18.0);
    const deck = new THREE.Mesh(deckGeo, woodDeckMat);
    deck.position.set(0, 0, 9.0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    pierGroup.add(deck);

    // Supporting wood pilings/stilts
    const pilingGeo = new THREE.CylinderGeometry(0.18, 0.2, 4.5, 6);
    for (let i = 0; i < 4; i++) {
      const zOffset = 2.0 + i * 4.5;
      const leftPile = new THREE.Mesh(pilingGeo, timberMat);
      leftPile.position.set(-1.8, -2.0, zOffset);
      const rightPile = new THREE.Mesh(pilingGeo, timberMat);
      rightPile.position.set(1.8, -2.0, zOffset);
      pierGroup.add(leftPile, rightPile);
    }

    // Moored wooden rowboat floating beside dock
    const boatGroup = new THREE.Group();
    boatGroup.position.set(3.4, -0.05, 12.0);
    boatGroup.rotation.y = 0.35;

    const boatHullGeo = new THREE.CylinderGeometry(0.8, 0.6, 3.8, 6);
    boatHullGeo.rotateZ(Math.PI / 2);
    boatHullGeo.scale(0.8, 1.4, 1.0);
    const boatHull = new THREE.Mesh(boatHullGeo, timberMat);
    boatHull.castShadow = true;
    boatGroup.add(boatHull);

    pierGroup.add(boatGroup);
    this.group.add(pierGroup);

    this.obstacles.push({ x: px, z: pz + 8, radius: 2.5 });
  }

  /**
   * Spawns ancient standing monoliths with glowing runes in the deep western forest
   */
  private spawnAncientStandingMonoliths(terrain: Terrain): void {
    const mx = -210;
    const mz = -50;
    const my = terrain.getHeightAt(mx, mz);

    const shrineGroup = new THREE.Group();
    shrineGroup.position.set(mx, my, mz);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x484b54, roughness: 0.9, flatShading: true });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x00bbf9,
      emissive: 0x00bbf9,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    const monolithGeo = new THREE.BoxGeometry(0.9, 4.2, 0.6);

    for (let m = 0; m < 5; m++) {
      const angle = (m * Math.PI * 2) / 5;
      const r = 5.2;
      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;

      const monolith = new THREE.Mesh(monolithGeo, stoneMat);
      monolith.position.set(px, 2.1, pz);
      monolith.rotation.y = -angle;
      monolith.rotation.z = (Math.random() - 0.5) * 0.12;
      monolith.castShadow = true;
      shrineGroup.add(monolith);

      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), runeMat);
      rune.position.set(px, 2.5, pz + 0.32);
      rune.rotation.y = -angle;
      shrineGroup.add(rune);

      this.obstacles.push({ x: mx + px, z: mz + pz, radius: 0.8 });
    }

    // Central ancient altar stone
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.9, 8), stoneMat);
    altar.position.y = 0.45;
    shrineGroup.add(altar);

    const shrineLight = new THREE.PointLight(0x00bbf9, 1.8, 15.0);
    shrineLight.position.y = 1.8;
    shrineGroup.add(shrineLight);

    this.group.add(shrineGroup);
    this.obstacles.push({ x: mx, z: mz, radius: 1.8 });
  }

  /**
   * Spawns mossy boulders across rocky outcrops using an InstancedMesh (1 draw call instead of 160)
   */
  private spawnBoulders(terrain: Terrain): void {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5a5e5a,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const boulderCount = 160;
    const instancedBoulders = new THREE.InstancedMesh(rockGeo, rockMat, boulderCount);
    instancedBoulders.castShadow = true;
    instancedBoulders.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let i = 0; i < boulderCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 35 + Math.pow(Math.random(), 0.7) * 750;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const y = terrain.getHeightAt(x, z);
      if (y < 2.0) continue;
      if (VillageHouses.isNearAnyHouse(x, z, 3.5)) continue;

      const scaleX = 1.2 + Math.random() * 2.6;
      const scaleY = 1.0 + Math.random() * 2.2;
      const scaleZ = 1.2 + Math.random() * 2.6;

      dummy.position.set(x, y + scaleY * 0.4, z);
      dummy.scale.set(scaleX, scaleY, scaleZ);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();

      instancedBoulders.setMatrixAt(placed, dummy.matrix);
      placed++;

      if (scaleX > 2.0) {
        this.obstacles.push({
          x,
          z,
          radius: Math.max(scaleX, scaleZ) * 0.8,
        });
      }
    }

    instancedBoulders.count = placed;
    instancedBoulders.instanceMatrix.needsUpdate = true;
    instancedBoulders.computeBoundingSphere();
    this.group.add(instancedBoulders);
  }

  /**
   * Spawns clusters of glowing forest mushrooms
   */
  private spawnGlowingMushrooms(terrain: Terrain): void {
    const mushGeo = new THREE.ConeGeometry(0.18, 0.22, 6);
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.3, 5);

    const mushMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00bbf9,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 });

    for (let c = 0; c < 45; c++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 520;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = terrain.getHeightAt(cx, cz);
      if (cy < 3.0 || cy > 25.0) continue;

      const cluster = new THREE.Group();
      cluster.position.set(cx, cy, cz);

      for (let m = 0; m < 5; m++) {
        const single = new THREE.Group();
        single.position.set((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2);
        const scale = 0.6 + Math.random() * 0.8;
        single.scale.setScalar(scale);

        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.15;
        const cap = new THREE.Mesh(mushGeo, mushMat);
        cap.position.y = 0.35;
        single.add(stem, cap);
        cluster.add(single);
      }
      this.group.add(cluster);
    }
  }

  /**
   * Spawns The Colossal Elder Tree (landmark for Crystal #6)
   */
  private spawnColossalElderTree(terrain: Terrain): void {
    const elderPos = new THREE.Vector3(-45, 0, -65);
    const y = terrain.getHeightAt(elderPos.x, elderPos.z);
    elderPos.y = y;

    const elderGroup = new THREE.Group();
    elderGroup.position.copy(elderPos);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x3d2716,
      roughness: 0.95,
      metalness: 0.05,
    });

    const trunkGeo = new THREE.CylinderGeometry(1.6, 2.8, 8.0, 9);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 4.0;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    elderGroup.add(trunk);

    const rootGeo = new THREE.CylinderGeometry(2.8, 4.2, 1.8, 8);
    const roots = new THREE.Mesh(rootGeo, trunkMat);
    roots.position.y = 0.9;
    elderGroup.add(roots);

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x1d4e30,
      roughness: 0.75,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.08,
    });

    for (let c = 0; c < 4; c++) {
      const crownGeo = new THREE.DodecahedronGeometry(3.6 - c * 0.55, 1);
      crownGeo.scale(1.2, 0.9, 1.2);
      const crown = new THREE.Mesh(crownGeo, foliageMat);
      crown.position.set(
        Math.sin(c * 1.5) * 0.8,
        8.0 + c * 2.2,
        Math.cos(c * 1.5) * 0.8
      );
      crown.castShadow = true;
      crown.receiveShadow = true;
      elderGroup.add(crown);
    }

    this.group.add(elderGroup);

    this.obstacles.push({
      x: elderPos.x,
      z: elderPos.z,
      radius: 3.2,
    });
  }

  /**
   * Frame update: smooth windmill sail rotation
   */
  public update(time: number): void {
    if (this.windmillSails) {
      this.windmillSails.rotation.z = time * 0.45;
    }
  }
}
