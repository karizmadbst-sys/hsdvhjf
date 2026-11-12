/**
 * ECHO – THE WORLD REMEMBERS
 * Dynamic Performance Manager & Graphics Scaler
 * Controls LOD, shadow map fidelity, draw distance, post-processing, and particle density.
 */

import * as THREE from 'three';

export type QualityPreset = 'low' | 'medium' | 'ultra';

export interface QualitySettings {
  preset: QualityPreset;
  labelAr: string;
  labelEn: string;
  dprMultiplier: number;
  maxDpr: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  shadowMapType: THREE.ShadowMapType;
  lightDistanceScale: number;
  fogNearMultiplier: number;
  fogDensity: number;
  farPlane: number;
  treeLodCutoff: number; // Max distance for distant foliage
  grassDensityPercent: number;
  enableExtraPointLights: boolean;
  maxParticleCount: number;
}

export const QUALITY_CONFIGS: Record<QualityPreset, QualitySettings> = {
  low: {
    preset: 'low',
    labelAr: 'ناعم (أداء فائق)',
    labelEn: 'Smooth (Max Performance)',
    dprMultiplier: 0.85,
    maxDpr: 1.0,
    shadowsEnabled: false,
    shadowMapSize: 512,
    shadowMapType: THREE.BasicShadowMap,
    lightDistanceScale: 0.6,
    fogNearMultiplier: 1.2,
    fogDensity: 0.0022,
    farPlane: 1100,
    treeLodCutoff: 300,
    grassDensityPercent: 0.35,
    enableExtraPointLights: false,
    maxParticleCount: 75,
  },
  medium: {
    preset: 'medium',
    labelAr: 'قياسي (متوازن)',
    labelEn: 'Standard (Balanced)',
    dprMultiplier: 1.0,
    maxDpr: 1.35,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowMapType: THREE.PCFShadowMap,
    lightDistanceScale: 0.85,
    fogNearMultiplier: 1.0,
    fogDensity: 0.0014,
    farPlane: 1800,
    treeLodCutoff: 550,
    grassDensityPercent: 0.70,
    enableExtraPointLights: true,
    maxParticleCount: 160,
  },
  ultra: {
    preset: 'ultra',
    labelAr: 'فائق (أعلى دقة)',
    labelEn: 'Ultra (Max Visuals)',
    dprMultiplier: 1.0,
    maxDpr: 1.75,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowMapType: THREE.PCFSoftShadowMap,
    lightDistanceScale: 1.0,
    fogNearMultiplier: 0.85,
    fogDensity: 0.0011,
    farPlane: 2400,
    treeLodCutoff: 900,
    grassDensityPercent: 1.0,
    enableExtraPointLights: true,
    maxParticleCount: 300,
  },
};

export class PerformanceManager {
  private currentPreset: QualityPreset = 'medium';
  private static readonly STORAGE_KEY = 'echo_game_quality_preset_v2';

  // Real-time FPS monitoring
  private fpsHistory: number[] = [];
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  public currentFps: number = 60;
  public averageFps: number = 60;

  constructor() {
    this.currentPreset = this.loadSavedPreset();
  }

  public getPreset(): QualityPreset {
    return this.currentPreset;
  }

  public getSettings(): QualitySettings {
    return QUALITY_CONFIGS[this.currentPreset];
  }

  public setPreset(preset: QualityPreset): QualitySettings {
    this.currentPreset = preset;
    try {
      localStorage.setItem(PerformanceManager.STORAGE_KEY, preset);
    } catch {
      // ignore
    }
    return QUALITY_CONFIGS[preset];
  }

  private loadSavedPreset(): QualityPreset {
    try {
      const saved = localStorage.getItem(PerformanceManager.STORAGE_KEY);
      if (saved && (saved === 'low' || saved === 'medium' || saved === 'ultra')) {
        return saved as QualityPreset;
      }
    } catch {
      // ignore
    }
    // Auto-detect mobile devices for balanced defaults
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 850;
    return isMobile ? 'medium' : 'ultra';
  }

  public recordFrame(now: number): void {
    this.frameCount++;
    const delta = now - this.lastFpsTime;
    if (delta >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / delta);
      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > 10) this.fpsHistory.shift();
      const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
      this.averageFps = Math.round(sum / this.fpsHistory.length);

      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }
}
