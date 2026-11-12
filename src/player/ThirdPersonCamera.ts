/**
 * ECHO – THE WORLD REMEMBERS
 * Third-Person Orbital Camera & Live Cinematic Title Cam
 * Smooth damping, pitch/yaw rotation, zoom control, and terrain collision avoidance.
 */

import * as THREE from 'three';
import { Terrain } from '../world/Terrain.ts';

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3;
  public currentPosition: THREE.Vector3;

  // Spherical angles
  public yaw: number = Math.PI; // Face towards island center
  public pitch: number = 0.28;  // Vertical tilt (radians)
  public distance: number = 6.8; // Distance behind player
  public sensitivity: number = 1.0; // Orbit speed multiplier

  // Perspective Mode (Third-Person vs First-Person)
  public isFirstPerson: boolean = false;
  public smoothTarget: THREE.Vector3;
  public isCinematic: boolean = true;
  public cinematicTime: number = 0;

  // Manual camera rotation tracking (The camera NEVER auto-rotates with analog or movement)
  public manualRotateTimer: number = 999;

  // Constraints
  private minPitch = -0.22;
  private maxPitch = 1.32;
  private minPitchFPP = -1.25;
  private maxPitchFPP = 1.25;
  private minDistance = 2.8;
  private maxDistance = 14.0;

  // Reusable scratchpad vectors for zero GC pressure in render loop
  private static readonly _scratchTarget = new THREE.Vector3();
  private static readonly _scratchDir = new THREE.Vector3();
  private static readonly _scratchTestPoint = new THREE.Vector3();
  private static readonly _scratchDesiredCam = new THREE.Vector3();
  private static readonly _scratchEyePos = new THREE.Vector3();
  private static readonly _scratchLookTarget = new THREE.Vector3();

  // Portrait mode adaptation (9:16 screens)
  public isPortraitMode: boolean = false;
  private portraitDistanceMultiplier: number = 1.0;
  private targetFov: number = 55;

  constructor(fov: number = 55, aspect: number = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2400);
    this.target = new THREE.Vector3(0, 5, 80);
    this.smoothTarget = this.target.clone();
    this.currentPosition = new THREE.Vector3(0, 10, 95);
    this.camera.position.copy(this.currentPosition);
    this.updateAspect(aspect);
  }

  /**
   * Adapts camera projection for 16:9 Landscape Cinema mode.
   * Fixed 16:9 landscape aspect ratio prevents visual distortions and provides a panoramic gaming experience.
   */
  public updateAspect(aspect: number): void {
    // Lock to widescreen landscape perspective
    this.camera.aspect = aspect;
    this.isPortraitMode = false;
    this.targetFov = 55;
    this.portraitDistanceMultiplier = 1.0;

    this.camera.fov = this.targetFov;
    this.camera.updateProjectionMatrix();
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    terrain: Terrain,
    playerFacingAngle?: number,
    isMoving: boolean = false
  ): void {
    const clampedDt = Math.min(dt, 0.05);
    this.manualRotateTimer += clampedDt;

    if (this.isCinematic) {
      // Cinematic live-world camera framing the glowing Great Portal with subtle mystical float
      this.cinematicTime += clampedDt * 0.25;
      const portalPos = Terrain.PORTAL_POS;
      const portalY = terrain.getHeightAt(portalPos.x, portalPos.z);

      const swayX = Math.sin(this.cinematicTime * 0.7) * 0.8;
      const swayY = Math.sin(this.cinematicTime * 1.1) * 0.35;
      const swayZ = Math.cos(this.cinematicTime * 0.6) * 0.8;

      // Position camera in front of the portal, angled so the portal sits on the right
      this.camera.position.set(
        portalPos.x - 17.5 + swayX,
        portalY + 4.2 + swayY,
        portalPos.z - 7.5 + swayZ
      );

      // Look slightly to the left of portal center so portal is framed on the right half
      const lookTarget = new THREE.Vector3(
        portalPos.x - 3.0,
        portalY + 6.5,
        portalPos.z + 1.0
      );
      this.camera.lookAt(lookTarget);
      return;
    }

    // ==========================================
    // 1. FIRST-PERSON PERSPECTIVE (منظور الشخص الأول)
    // ==========================================
    if (this.isFirstPerson) {
      // Eye-level viewpoint at adventurer head height (approx 1.62m)
      ThirdPersonCamera._scratchEyePos.copy(playerPos).add({ x: 0, y: 1.62, z: 0 } as THREE.Vector3);
      
      // Look direction vector calculated from spherical yaw & pitch
      const cosPitch = Math.cos(this.pitch);
      const sinPitch = Math.sin(this.pitch);
      const sinYaw = Math.sin(this.yaw);
      const cosYaw = Math.cos(this.yaw);

      const forwardX = -sinYaw * cosPitch;
      const forwardY = sinPitch;
      const forwardZ = -cosYaw * cosPitch;

      // Slight forward offset to clear any internal neck/head geometry
      ThirdPersonCamera._scratchDesiredCam.set(
        ThirdPersonCamera._scratchEyePos.x - sinYaw * 0.12,
        ThirdPersonCamera._scratchEyePos.y,
        ThirdPersonCamera._scratchEyePos.z - cosYaw * 0.12
      );
      
      this.currentPosition.lerp(ThirdPersonCamera._scratchDesiredCam, Math.min(1, 28.0 * clampedDt));
      this.camera.position.copy(this.currentPosition);

      ThirdPersonCamera._scratchLookTarget.set(
        this.camera.position.x + forwardX,
        this.camera.position.y + forwardY,
        this.camera.position.z + forwardZ
      );
      this.camera.lookAt(ThirdPersonCamera._scratchLookTarget);
      return;
    }

    // ==========================================
    // 2. THIRD-PERSON PERSPECTIVE (منظور الشخص الثالث)
    // ==========================================

    // Follow player chest/head smoothly - in portrait mode, target slightly lower on screen so upper space is open
    const targetYOffset = this.isPortraitMode ? 1.40 : 1.55;
    ThirdPersonCamera._scratchTarget.set(playerPos.x, playerPos.y + targetYOffset, playerPos.z);
    this.smoothTarget.lerp(ThirdPersonCamera._scratchTarget, Math.min(1, 14.0 * clampedDt));

    // Calculate ideal camera position from spherical coordinates
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const baseDistance = this.distance * (this.isPortraitMode ? this.portraitDistanceMultiplier : 1.0);
    let effectiveDistance = baseDistance;

    // Line-of-sight terrain collision test (push-in if hill blocks view)
    ThirdPersonCamera._scratchDir.set(
      cosPitch * sinYaw,
      sinPitch,
      cosPitch * cosYaw
    ).normalize();

    // Check 6 intermediate samples along ray without allocating new objects
    for (let s = 1; s <= 6; s++) {
      const distSample = (baseDistance / 6) * s;
      ThirdPersonCamera._scratchTestPoint.copy(this.smoothTarget).addScaledVector(ThirdPersonCamera._scratchDir, distSample);
      const groundAtPoint = terrain.getHeightAt(ThirdPersonCamera._scratchTestPoint.x, ThirdPersonCamera._scratchTestPoint.z);
      if (ThirdPersonCamera._scratchTestPoint.y < groundAtPoint + 0.6) {
        effectiveDistance = Math.max(this.minDistance, (baseDistance / 6) * (s - 0.5));
        break;
      }
    }

    const offsetX = effectiveDistance * cosPitch * sinYaw;
    const offsetY = effectiveDistance * sinPitch;
    const offsetZ = effectiveDistance * cosPitch * cosYaw;

    ThirdPersonCamera._scratchDesiredCam.set(
      this.smoothTarget.x + offsetX,
      this.smoothTarget.y + offsetY,
      this.smoothTarget.z + offsetZ
    );

    // Ground collision avoidance: don't let camera go below terrain + 0.85m
    const terrainHeight = terrain.getHeightAt(ThirdPersonCamera._scratchDesiredCam.x, ThirdPersonCamera._scratchDesiredCam.z);
    if (ThirdPersonCamera._scratchDesiredCam.y < terrainHeight + 0.85) {
      ThirdPersonCamera._scratchDesiredCam.y = terrainHeight + 0.85;
    }

    // Smooth camera damping
    this.currentPosition.lerp(ThirdPersonCamera._scratchDesiredCam, Math.min(1, 16.0 * clampedDt));
    this.camera.position.copy(this.currentPosition);

    this.camera.lookAt(this.smoothTarget);
  }

  public rotate(deltaYaw: number, deltaPitch: number): void {
    if (this.isCinematic) return;
    this.manualRotateTimer = 0; // Reset timer on manual camera interaction
    this.yaw -= deltaYaw * 0.0035 * this.sensitivity;
    this.pitch += deltaPitch * 0.0035 * this.sensitivity;

    // Clamp vertical pitch appropriately depending on perspective mode
    const minP = this.isFirstPerson ? this.minPitchFPP : this.minPitch;
    const maxP = this.isFirstPerson ? this.maxPitchFPP : this.maxPitch;
    this.pitch = Math.max(minP, Math.min(maxP, this.pitch));
  }

  public zoom(delta: number): void {
    if (this.isCinematic) return;
    if (this.isFirstPerson) {
      // Zooming out in first-person smoothly switches back to third-person
      if (delta > 0) {
        this.setPerspectiveMode(false);
        this.distance = this.minDistance;
      }
      return;
    }

    this.distance += delta * 0.005;
    if (this.distance < this.minDistance - 0.5) {
      // Zooming in very close switches to first-person
      this.setPerspectiveMode(true);
      return;
    }
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
  }

  public togglePerspective(): boolean {
    return this.setPerspectiveMode(!this.isFirstPerson);
  }

  public setPerspectiveMode(firstPerson: boolean): boolean {
    this.isFirstPerson = firstPerson;
    this.manualRotateTimer = 0;
    if (this.isFirstPerson) {
      this.pitch = Math.max(-0.25, Math.min(0.25, this.pitch)); // Level view
    } else {
      this.pitch = 0.28;
      this.distance = Math.max(this.minDistance, 6.2);
    }
    return this.isFirstPerson;
  }

  public getYaw(): number {
    return this.yaw;
  }
}
