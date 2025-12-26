"use client";

import { useRef, useEffect, useState, Suspense, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useVideoTexture, useTexture } from "@react-three/drei";
import type { Group } from "three";
import * as THREE from "three";
import type { TVTextureConfig, PlasticConfig } from "./TVTextureControls";

// Creator coin image type
interface CreatorCoinImage {
  coinAddress: string;
  imageUrl: string;
  symbol?: string;
}

interface TV3DModelProps {
  videoUrl?: string;
  autoRotate?: boolean;
  rotationSpeed?: number;
  onNextVideo?: () => void;
  textureConfig?: TVTextureConfig;
  creatorCoinImages?: CreatorCoinImage[];
}

// Pre-calculated constants
const ROTATION_ANGLE = Math.PI / 8;
const MAX_OSCILLATION = Math.PI / 4.5; // ~40 degrees
const TARGET_FPS = 24;
const FRAME_INTERVAL = 1 / TARGET_FPS; // ~42ms between frames

// Shared geometries (created once, reused)
const sharedGeometries = {
  cabinet: new THREE.BoxGeometry(2.4, 1.6, 0.9),
  screenBezel: new THREE.BoxGeometry(1.4, 1.2, 0.04),
  innerBezel: new THREE.BoxGeometry(1.25, 1.05, 0.02),
  screen: new THREE.PlaneGeometry(1.15, 0.95),
  controlPanel: new THREE.BoxGeometry(0.55, 1.2, 0.04),
  button: new THREE.BoxGeometry(0.12, 0.06, 0.12),
  speakerLine: new THREE.BoxGeometry(0.4, 0.04, 0.02),
  indicator: new THREE.BoxGeometry(0.06, 0.06, 0.02),
  base: new THREE.BoxGeometry(2.4, 0.1, 0.9),
  antennaBase: new THREE.BoxGeometry(0.25, 0.12, 0.2),
  antenna: new THREE.CylinderGeometry(0.025, 0.035, 0.9, 8),
  antennaTip: new THREE.SphereGeometry(0.04, 8, 8),
  sticker: new THREE.PlaneGeometry(0.25, 0.25),
  stickerLarge: new THREE.PlaneGeometry(0.35, 0.35),
  stickerBase: new THREE.PlaneGeometry(0.25, 0.25),
};

// Procedural wood shader with uniforms
const woodVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormalObject;
  varying vec3 vNormalWorld;

  void main() {
    vPosition = position;
    vNormalObject = normal;
    vNormalWorld = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const woodFragmentShader = `
  uniform float uPixelSize;
  uniform float uGrainIntensity;
  uniform float uGrainScale;
  uniform float uQuantizeLevels;
  uniform float uLightingIntensity;
  uniform vec3 uColorDark;
  uniform vec3 uColorMid;
  uniform vec3 uColorLight;
  uniform vec3 uColorHighlight;

  varying vec3 vPosition;
  varying vec3 vNormalObject;
  varying vec3 vNormalWorld;

  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // Determine face and get coordinates
    vec3 absNormal = abs(vNormalObject);
    vec2 woodCoord;

    if (absNormal.y > 0.5) {
      woodCoord = vec2(vPosition.x, vPosition.z);
    } else if (absNormal.x > 0.5) {
      woodCoord = vec2(vPosition.z, vPosition.y);
    } else {
      woodCoord = vec2(vPosition.x, vPosition.y);
    }

    // Pixelate coordinates
    vec2 pixelCoord = floor(woodCoord / uPixelSize) * uPixelSize;

    // Wood grain pattern
    float grain = snoise(vec2(pixelCoord.x * 1.0, pixelCoord.y * uGrainScale)) * uGrainIntensity;
    grain += snoise(vec2(pixelCoord.x * 2.0, pixelCoord.y * uGrainScale * 2.0)) * 0.5 * uGrainIntensity;
    grain = grain * 0.5 + 0.5;

    // Quantize pattern
    float levels = uQuantizeLevels;
    float pattern = floor(grain * levels) / levels;

    // Color selection with smooth blending for high quantize levels
    vec3 color;
    if (levels <= 4.0) {
      // Hard color bands for pixel art
      if (pattern < 0.25) color = uColorDark;
      else if (pattern < 0.5) color = uColorMid;
      else if (pattern < 0.75) color = uColorLight;
      else color = uColorHighlight;
    } else {
      // Smooth gradient for realistic look
      if (pattern < 0.33) {
        color = mix(uColorDark, uColorMid, pattern * 3.0);
      } else if (pattern < 0.66) {
        color = mix(uColorMid, uColorLight, (pattern - 0.33) * 3.0);
      } else {
        color = mix(uColorLight, uColorHighlight, (pattern - 0.66) * 3.0);
      }
    }

    // Lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0));
    float diff = max(dot(vNormalWorld, lightDir), 0.0);

    // Quantize lighting for pixel art, smooth for realistic
    float lighting;
    if (levels <= 4.0) {
      lighting = uLightingIntensity + floor(diff * 3.0) / 6.0;
    } else {
      lighting = uLightingIntensity + diff * (1.0 - uLightingIntensity);
    }

    color = color * lighting;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Default wood config
const defaultWoodConfig = {
  pixelSize: 0.035,
  grainIntensity: 1.0,
  grainScale: 2.5,
  quantizeLevels: 4,
  lightingIntensity: 0.35,
  colorDark: [0.18, 0.10, 0.05] as [number, number, number],
  colorMid: [0.28, 0.18, 0.10] as [number, number, number],
  colorLight: [0.38, 0.25, 0.15] as [number, number, number],
  colorHighlight: [0.48, 0.32, 0.20] as [number, number, number],
};

// Wood Cabinet component with dynamic uniforms
function WoodCabinet({ config }: { config?: TVTextureConfig["wood"] }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const settings = config ?? defaultWoodConfig;

  const uniforms = useMemo(() => ({
    uPixelSize: { value: settings.pixelSize },
    uGrainIntensity: { value: settings.grainIntensity },
    uGrainScale: { value: settings.grainScale },
    uQuantizeLevels: { value: settings.quantizeLevels },
    uLightingIntensity: { value: settings.lightingIntensity },
    uColorDark: { value: new THREE.Vector3(...settings.colorDark) },
    uColorMid: { value: new THREE.Vector3(...settings.colorMid) },
    uColorLight: { value: new THREE.Vector3(...settings.colorLight) },
    uColorHighlight: { value: new THREE.Vector3(...settings.colorHighlight) },
  }), []);

  // Update uniforms when config changes
  useEffect(() => {
    if (materialRef.current && config) {
      materialRef.current.uniforms.uPixelSize.value = config.pixelSize;
      materialRef.current.uniforms.uGrainIntensity.value = config.grainIntensity;
      materialRef.current.uniforms.uGrainScale.value = config.grainScale;
      materialRef.current.uniforms.uQuantizeLevels.value = config.quantizeLevels;
      materialRef.current.uniforms.uLightingIntensity.value = config.lightingIntensity;
      materialRef.current.uniforms.uColorDark.value.set(...config.colorDark);
      materialRef.current.uniforms.uColorMid.value.set(...config.colorMid);
      materialRef.current.uniforms.uColorLight.value.set(...config.colorLight);
      materialRef.current.uniforms.uColorHighlight.value.set(...config.colorHighlight);
    }
  }, [config]);

  return (
    <mesh position={[0, 0, 0]} geometry={sharedGeometries.cabinet}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={woodVertexShader}
        fragmentShader={woodFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Vintage plastic shader for front panel
const plasticVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const plasticFragmentShader = `
  uniform vec3 uBaseColor;
  uniform float uPixelSize;
  uniform float uNoiseIntensity;
  uniform float uYellowing;

  varying vec3 vPosition;
  varying vec3 vNormal;

  // Simple hash for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Pixelate coordinates
    vec2 coord = vPosition.xy;
    vec2 pixelCoord = floor(coord / uPixelSize) * uPixelSize;

    // Generate noise for plastic texture
    float noise = hash(pixelCoord * 50.0);
    noise = (noise - 0.5) * uNoiseIntensity;

    // Base color with slight variation
    vec3 color = uBaseColor;

    // Add yellowing (aging effect) - more yellow in some areas
    float yellowNoise = hash(pixelCoord * 10.0);
    vec3 yellowTint = vec3(0.05, 0.03, -0.02) * uYellowing * yellowNoise;
    color += yellowTint;

    // Add noise variation
    color += vec3(noise * 0.6, noise * 0.5, noise * 0.4);

    // Quantize colors for pixel art look
    color = floor(color * 16.0) / 16.0;

    // Simple lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float lighting = 0.5 + diff * 0.5;

    // Subtle specular for plastic sheen
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 16.0) * 0.1;

    color = color * lighting + vec3(spec);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Default plastic config
const defaultPlasticConfig = {
  baseColor: [0.91, 0.86, 0.78] as [number, number, number],
  pixelSize: 0.025,
  noiseIntensity: 0.06,
  yellowing: 0.4,
};

// Dark rubber/plastic shader for bezels and antenna base
const darkRubberVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const darkRubberFragmentShader = `
  uniform vec3 uBaseColor;
  uniform float uPixelSize;
  uniform float uNoiseIntensity;
  uniform float uWearAmount;

  varying vec3 vPosition;
  varying vec3 vNormal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 coord = vPosition.xy + vPosition.z * 0.5;
    vec2 pixelCoord = floor(coord / uPixelSize) * uPixelSize;

    // Noise for rubber texture
    float noise = hash(pixelCoord * 80.0);
    noise = (noise - 0.5) * uNoiseIntensity;

    // Base color with wear/scuff marks
    vec3 color = uBaseColor;

    // Wear effect - lighter spots where rubber is worn
    float wearNoise = hash(pixelCoord * 15.0);
    if (wearNoise > (1.0 - uWearAmount * 0.3)) {
      color += vec3(0.12, 0.11, 0.10);
    }

    // Add fine grain noise
    color += vec3(noise * 0.6);

    // Quantize for pixel art
    color = floor(color * 12.0) / 12.0;

    // Brighter lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float lighting = 0.75 + diff * 0.35;

    // Matte finish (no specular)
    color = color * lighting;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Colored button plastic shader
const buttonPlasticVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const buttonPlasticFragmentShader = `
  uniform vec3 uBaseColor;
  uniform float uPixelSize;

  varying vec3 vPosition;
  varying vec3 vNormal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 coord = vPosition.xy;
    vec2 pixelCoord = floor(coord / uPixelSize) * uPixelSize;

    // Subtle noise for plastic surface
    float noise = hash(pixelCoord * 100.0);
    noise = (noise - 0.5) * 0.06;

    vec3 color = uBaseColor + vec3(noise);

    // Quantize for pixel art
    color = floor(color * 10.0) / 10.0;

    // Brighter lighting for buttons
    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float lighting = 0.7 + diff * 0.4;

    // Plastic specular highlight
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0) * 0.3;

    color = color * lighting + vec3(spec);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Metal grill shader for speaker
const metalGrillVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const metalGrillFragmentShader = `
  uniform vec3 uBaseColor;
  uniform float uPixelSize;

  varying vec3 vPosition;
  varying vec3 vNormal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 coord = vPosition.xy;
    vec2 pixelCoord = floor(coord / uPixelSize) * uPixelSize;

    // Metallic noise pattern
    float noise = hash(pixelCoord * 60.0);
    noise = (noise - 0.5) * 0.12;

    // Horizontal line pattern for grill
    float linePattern = step(0.5, fract(coord.y / 0.02));

    vec3 color = uBaseColor;
    color += vec3(noise);
    color *= 0.9 + linePattern * 0.1;

    // Quantize
    color = floor(color * 10.0) / 10.0;

    // Brighter metallic lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float lighting = 0.6 + diff * 0.5;

    // Metallic specular
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 24.0) * 0.25;

    color = color * lighting + vec3(spec * 0.9, spec * 0.8, spec * 0.7);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Brushed metal shader for antennas
const brushedMetalVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const brushedMetalFragmentShader = `
  uniform vec3 uBaseColor;
  uniform float uPixelSize;
  uniform float uBrushDirection; // 0 = horizontal, 1 = vertical

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Use cylindrical coordinates for antenna
    vec2 coord = vec2(vPosition.y, atan(vPosition.x, vPosition.z));
    vec2 pixelCoord = floor(coord / uPixelSize) * uPixelSize;

    // Brushed metal streaks along length
    float streak = hash(vec2(pixelCoord.y * 200.0, floor(pixelCoord.x * 50.0)));
    streak = (streak - 0.5) * 0.10;

    // Fine grain noise
    float noise = hash(pixelCoord * 100.0) * 0.04 - 0.02;

    vec3 color = uBaseColor + vec3(streak + noise);

    // Quantize for pixel art
    color = floor(color * 14.0) / 14.0;

    // Brighter metallic lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float lighting = 0.55 + diff * 0.55;

    // Strong specular for metal
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 48.0) * 0.45;

    color = color * lighting + vec3(spec);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Dark wood shader for base (reuses wood logic but darker)
const darkWoodFragmentShader = `
  uniform float uPixelSize;
  uniform float uGrainIntensity;
  uniform float uGrainScale;

  varying vec3 vPosition;
  varying vec3 vNormalObject;
  varying vec3 vNormalWorld;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec3 absNormal = abs(vNormalObject);
    vec2 woodCoord;

    if (absNormal.y > 0.5) {
      woodCoord = vec2(vPosition.x, vPosition.z);
    } else if (absNormal.x > 0.5) {
      woodCoord = vec2(vPosition.z, vPosition.y);
    } else {
      woodCoord = vec2(vPosition.x, vPosition.y);
    }

    vec2 pixelCoord = floor(woodCoord / uPixelSize) * uPixelSize;

    float grain = snoise(vec2(pixelCoord.x * 1.0, pixelCoord.y * uGrainScale)) * uGrainIntensity;
    grain += snoise(vec2(pixelCoord.x * 2.0, pixelCoord.y * uGrainScale * 2.0)) * 0.5 * uGrainIntensity;
    grain = grain * 0.5 + 0.5;

    float pattern = floor(grain * 4.0) / 4.0;

    // Very dark wood colors
    vec3 colorDark = vec3(0.05, 0.03, 0.02);
    vec3 colorMid = vec3(0.09, 0.06, 0.03);
    vec3 colorLight = vec3(0.13, 0.09, 0.05);
    vec3 colorHighlight = vec3(0.17, 0.11, 0.07);

    vec3 color;
    if (pattern < 0.25) color = colorDark;
    else if (pattern < 0.5) color = colorMid;
    else if (pattern < 0.75) color = colorLight;
    else color = colorHighlight;

    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0));
    float diff = max(dot(vNormalWorld, lightDir), 0.0);
    float lighting = 0.5 + floor(diff * 3.0) / 5.0;

    color = color * lighting;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Vintage Plastic Panel component
function VintagePlasticPanel({
  geometry,
  position,
  config,
  colorOffset = [0, 0, 0],
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  config?: PlasticConfig;
  colorOffset?: [number, number, number];
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const settings = config ?? defaultPlasticConfig;

  const adjustedColor: [number, number, number] = [
    settings.baseColor[0] + colorOffset[0],
    settings.baseColor[1] + colorOffset[1],
    settings.baseColor[2] + colorOffset[2],
  ];

  const uniforms = useMemo(() => ({
    uBaseColor: { value: new THREE.Vector3(...adjustedColor) },
    uPixelSize: { value: settings.pixelSize },
    uNoiseIntensity: { value: settings.noiseIntensity },
    uYellowing: { value: settings.yellowing },
  }), []);

  // Update uniforms when config changes
  useEffect(() => {
    if (materialRef.current && config) {
      materialRef.current.uniforms.uBaseColor.value.set(
        config.baseColor[0] + colorOffset[0],
        config.baseColor[1] + colorOffset[1],
        config.baseColor[2] + colorOffset[2]
      );
      materialRef.current.uniforms.uPixelSize.value = config.pixelSize;
      materialRef.current.uniforms.uNoiseIntensity.value = config.noiseIntensity;
      materialRef.current.uniforms.uYellowing.value = config.yellowing;
    }
  }, [config, colorOffset]);

  return (
    <mesh position={position} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={plasticVertexShader}
        fragmentShader={plasticFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Dark rubber component for bezels
function DarkRubberPanel({
  geometry,
  position,
  baseColor = [0.17, 0.17, 0.17] as [number, number, number],
  pixelSize = 0.02,
  noiseIntensity = 0.08,
  wearAmount = 0.5,
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  baseColor?: [number, number, number];
  pixelSize?: number;
  noiseIntensity?: number;
  wearAmount?: number;
}) {
  const uniforms = useMemo(() => ({
    uBaseColor: { value: new THREE.Vector3(...baseColor) },
    uPixelSize: { value: pixelSize },
    uNoiseIntensity: { value: noiseIntensity },
    uWearAmount: { value: wearAmount },
  }), [baseColor, pixelSize, noiseIntensity, wearAmount]);

  return (
    <mesh position={position} geometry={geometry}>
      <shaderMaterial
        vertexShader={darkRubberVertexShader}
        fragmentShader={darkRubberFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Colored plastic button component
function PlasticButton({
  geometry,
  position,
  rotation,
  baseColor,
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  baseColor: [number, number, number];
}) {
  const uniforms = useMemo(() => ({
    uBaseColor: { value: new THREE.Vector3(...baseColor) },
    uPixelSize: { value: 0.015 },
  }), [baseColor]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry}>
      <shaderMaterial
        vertexShader={buttonPlasticVertexShader}
        fragmentShader={buttonPlasticFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Metal grill component for speaker
function MetalGrill({
  geometry,
  position,
  baseColor = [0.66, 0.56, 0.44] as [number, number, number],
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  baseColor?: [number, number, number];
}) {
  const uniforms = useMemo(() => ({
    uBaseColor: { value: new THREE.Vector3(...baseColor) },
    uPixelSize: { value: 0.012 },
  }), [baseColor]);

  return (
    <mesh position={position} geometry={geometry}>
      <shaderMaterial
        vertexShader={metalGrillVertexShader}
        fragmentShader={metalGrillFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Brushed metal component for antennas
function BrushedMetal({
  geometry,
  position,
  rotation,
  baseColor = [0.75, 0.75, 0.75] as [number, number, number],
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  baseColor?: [number, number, number];
}) {
  const uniforms = useMemo(() => ({
    uBaseColor: { value: new THREE.Vector3(...baseColor) },
    uPixelSize: { value: 0.02 },
    uBrushDirection: { value: 1.0 },
  }), [baseColor]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry}>
      <shaderMaterial
        vertexShader={brushedMetalVertexShader}
        fragmentShader={brushedMetalFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Dark wood base component
function DarkWoodBase({
  geometry,
  position,
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
}) {
  const uniforms = useMemo(() => ({
    uPixelSize: { value: 0.05 },       // Larger pixels = more pixelated look
    uGrainIntensity: { value: 1.8 },   // Very pronounced grain
    uGrainScale: { value: 8.0 },       // Dense grain patterns
  }), []);

  return (
    <mesh position={position} geometry={geometry}>
      <shaderMaterial
        vertexShader={woodVertexShader}
        fragmentShader={darkWoodFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Shared materials (using cheaper Lambert instead of Standard where possible)
const sharedMaterials = {
  white: new THREE.MeshLambertMaterial({ color: "#FFFFFF" }),
  darkBezel: new THREE.MeshLambertMaterial({ color: "#2C2C2C" }),
  innerBezel: new THREE.MeshLambertMaterial({ color: "#1a1a1a" }),
  screenBg: new THREE.MeshBasicMaterial({ color: "#000" }),
  buttonRed: new THREE.MeshLambertMaterial({ color: "#CC3333" }),
  buttonGreen: new THREE.MeshLambertMaterial({ color: "#33AA33" }),
  buttonBlue: new THREE.MeshLambertMaterial({ color: "#3366CC" }),
  speaker: new THREE.MeshLambertMaterial({ color: "#A89070" }),
  indicator: new THREE.MeshLambertMaterial({ color: "#333333" }),
  baseDark: new THREE.MeshLambertMaterial({ color: "#2A1F14" }),
  antennaBaseMat: new THREE.MeshLambertMaterial({ color: "#1a1a1a" }),
  antennaMetal: new THREE.MeshStandardMaterial({ color: "#C0C0C0", metalness: 0.9, roughness: 0.2 }),
  antennaTipMat: new THREE.MeshStandardMaterial({ color: "#D0D0D0", metalness: 0.9, roughness: 0.2 }),
};

// Convert ipfs.io URLs to faster gateway
function toFastIPFS(url?: string): string | undefined {
  if (!url) return undefined;
  return url
    .replace("https://ipfs.io/ipfs/", "https://dweb.link/ipfs/")
    .replace("https://cloudflare-ipfs.com/ipfs/", "https://dweb.link/ipfs/");
}

// Vertex shader (shared by all screen effects)
const crtVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Static color bars shader (no animation - much lighter)
const colorBarsShader = `
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 center = uv - 0.5;
    float dist = dot(center, center);

    uv = uv + center * dist * 0.08;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec3 color;
    float x = uv.x;

    // SMPTE color bars
    if (x < 0.143) color = vec3(0.75, 0.75, 0.75);
    else if (x < 0.286) color = vec3(0.75, 0.75, 0.0);
    else if (x < 0.429) color = vec3(0.0, 0.75, 0.75);
    else if (x < 0.571) color = vec3(0.0, 0.75, 0.0);
    else if (x < 0.714) color = vec3(0.75, 0.0, 0.75);
    else if (x < 0.857) color = vec3(0.75, 0.0, 0.0);
    else color = vec3(0.0, 0.0, 0.75);

    // Scanlines + vignette
    color *= (mod(gl_FragCoord.y, 3.0) < 1.0 ? 0.9 : 1.0) * (1.0 - dist * 1.2);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Shared shader material for color bars (created once)
const colorBarsShaderMaterial = new THREE.ShaderMaterial({
  vertexShader: crtVertexShader,
  fragmentShader: colorBarsShader,
});

// Color bars component - static, no useFrame for better performance
function ColorBarsScreen() {
  return (
    <mesh position={[0, 0, 0.521]} geometry={sharedGeometries.screen} material={colorBarsShaderMaterial} />
  );
}

const crtFragmentShader = `
  uniform sampler2D uTexture;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 center = uv - 0.5;
    float dist = dot(center, center);

    // Barrel distortion
    uv = uv + center * dist * 0.1;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec4 color = texture2D(uTexture, uv);

    // Scanlines + vignette + color tint combined
    float scanline = sin(uv.y * 400.0) * 0.08;
    float vignette = 1.0 - dist * 1.5;

    color.rgb = (color.rgb - scanline) * vignette * vec3(1.045, 1.1, 1.078);

    gl_FragColor = color;
  }
`;

// Video Screen component that uses VideoTexture with CRT effect
function VideoScreen({ videoUrl }: { videoUrl: string }) {
  const texture = useVideoTexture(videoUrl, {
    muted: true,
    loop: true,
    start: true,
    crossOrigin: "anonymous",
  });

  texture.colorSpace = THREE.SRGBColorSpace;
  // Use nearest filter for pixelated look and better performance
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
  }), [texture]);

  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // Update texture on each frame (controlled by parent's 24fps heartbeat)
  useFrame(() => {
    texture.needsUpdate = true;
  });

  return (
    <mesh position={[0, 0, 0.521]} geometry={sharedGeometries.screen}>
      <shaderMaterial
        vertexShader={crtVertexShader}
        fragmentShader={crtFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Fallback screen when no video
const fallbackMaterial = new THREE.MeshBasicMaterial({ color: "#111" });
function FallbackScreen() {
  return (
    <mesh position={[0, 0, 0.521]} geometry={sharedGeometries.screen} material={fallbackMaterial} />
  );
}

// Vintage sticker shader - pixelated with wear effects
const stickerVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// White border shader for sticker background
const stickerBorderFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uPixelSize;
  uniform float uIsCircle;

  varying vec2 vUv;

  void main() {
    // Circle mask
    if (uIsCircle > 0.5) {
      vec2 center = vUv - 0.5;
      if (length(center) > 0.5) {
        discard;
      }
    }

    // Pixelate UV coordinates
    vec2 pixelUv = floor(vUv / uPixelSize) * uPixelSize + uPixelSize * 0.5;

    // Sample texture alpha
    float alpha = texture2D(uTexture, pixelUv).a;

    // Only render where there's content
    if (alpha < 0.1) {
      discard;
    }

    // White color with slight off-white tint
    gl_FragColor = vec4(0.95, 0.93, 0.90, 1.0);
  }
`;

// Sticker fragment shader with circle support
const stickerFragmentShaderWithShape = `
  uniform sampler2D uTexture;
  uniform float uPixelSize;
  uniform float uWearAmount;
  uniform float uColorLevels;
  uniform float uIsCircle;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Circle mask
    if (uIsCircle > 0.5) {
      vec2 center = vUv - 0.5;
      if (length(center) > 0.5) {
        discard;
      }
    }

    // Pixelate UV coordinates
    vec2 pixelUv = floor(vUv / uPixelSize) * uPixelSize + uPixelSize * 0.5;

    // Sample texture
    vec4 texColor = texture2D(uTexture, pixelUv);

    // Skip transparent pixels
    if (texColor.a < 0.1) {
      discard;
    }

    // Quantize colors for pixel art look
    vec3 color = floor(texColor.rgb * uColorLevels) / uColorLevels;

    // Subtle random wear spots
    float wearNoise = hash(pixelUv * 50.0);
    float wear = step(1.0 - uWearAmount * 0.05, wearNoise);

    // Very slight vintage tint
    color += vec3(0.01, 0.005, -0.005);

    // Apply subtle wear - lighter spots
    color = mix(color, color + vec3(0.08), wear);

    gl_FragColor = vec4(color, texColor.a);
  }
`;

// Sticker component with texture
interface StickerProps {
  imagePath: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  pixelSize?: number;
  wearAmount?: number;
  borderScale?: number;
  isCircle?: boolean;
}

function Sticker({
  imagePath,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  pixelSize = 0.025,
  wearAmount = 0.5,
  borderScale = 1.1,
  isCircle = false,
}: StickerProps) {
  const texture = useTexture(imagePath);

  // Ensure texture uses correct color space
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uPixelSize: { value: pixelSize },
    uWearAmount: { value: wearAmount },
    uColorLevels: { value: 12.0 },
    uIsCircle: { value: isCircle ? 1.0 : 0.0 },
  }), [texture, pixelSize, wearAmount, isCircle]);

  const borderUniforms = useMemo(() => ({
    uTexture: { value: texture },
    uPixelSize: { value: pixelSize },
    uIsCircle: { value: isCircle ? 1.0 : 0.0 },
  }), [texture, pixelSize, isCircle]);

  // Memoize materials to prevent recreation every render
  const borderMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: stickerVertexShader,
    fragmentShader: stickerBorderFragmentShader,
    uniforms: borderUniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), [borderUniforms]);

  const mainMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: stickerVertexShader,
    fragmentShader: stickerFragmentShaderWithShape,
    uniforms: uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), [uniforms]);

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      borderMaterial.dispose();
      mainMaterial.dispose();
    };
  }, [borderMaterial, mainMaterial]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* White border behind */}
      <mesh position={[0, 0, -0.001]} scale={borderScale} renderOrder={0} geometry={sharedGeometries.stickerBase} material={borderMaterial} />
      {/* Main sticker */}
      <mesh renderOrder={1} geometry={sharedGeometries.stickerBase} material={mainMaterial} />
    </group>
  );
}

// Proxy image URL through wsrv.nl to bypass CORS
function proxyImageUrl(url?: string): string | undefined {
  if (!url) return undefined;

  // Convert IPFS URLs first
  let httpUrl = url;
  if (url.startsWith("ipfs://")) {
    httpUrl = url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }

  // Use wsrv.nl as CORS proxy for external images
  // This service adds proper CORS headers
  // Also resize to 256px for performance (stickers don't need high res)
  return `https://wsrv.nl/?url=${encodeURIComponent(httpUrl)}&w=256&h=256&fit=cover`;
}

// Dynamic sticker that loads from URL
interface DynamicStickerProps {
  imageUrl: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isCircle?: boolean;
}

function DynamicSticker({
  imageUrl: rawImageUrl,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  isCircle = false,
}: DynamicStickerProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const imageUrl = proxyImageUrl(rawImageUrl) || rawImageUrl;

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      imageUrl,
      (loadedTexture) => {
        if (cancelled) {
          loadedTexture.dispose();
          return;
        }
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.minFilter = THREE.NearestFilter;
        loadedTexture.magFilter = THREE.NearestFilter;
        textureRef.current = loadedTexture;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.warn("[DynamicSticker] Failed to load texture:", imageUrl, error);
      }
    );
    return () => {
      cancelled = true;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [imageUrl]);

  const uniforms = useMemo(() => {
    if (!texture) return null;
    return {
      uTexture: { value: texture },
      uPixelSize: { value: 0.025 },
      uWearAmount: { value: 0.3 },
      uColorLevels: { value: 12.0 },
      uIsCircle: { value: isCircle ? 1.0 : 0.0 },
    };
  }, [texture, isCircle]);

  const borderUniforms = useMemo(() => {
    if (!texture) return null;
    return {
      uTexture: { value: texture },
      uPixelSize: { value: 0.025 },
      uIsCircle: { value: isCircle ? 1.0 : 0.0 },
    };
  }, [texture, isCircle]);

  // Memoize materials
  const borderMaterial = useMemo(() => {
    if (!borderUniforms) return null;
    return new THREE.ShaderMaterial({
      vertexShader: stickerVertexShader,
      fragmentShader: stickerBorderFragmentShader,
      uniforms: borderUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [borderUniforms]);

  const mainMaterial = useMemo(() => {
    if (!uniforms) return null;
    return new THREE.ShaderMaterial({
      vertexShader: stickerVertexShader,
      fragmentShader: stickerFragmentShaderWithShape,
      uniforms: uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [uniforms]);

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      borderMaterial?.dispose();
      mainMaterial?.dispose();
    };
  }, [borderMaterial, mainMaterial]);

  if (!texture || !borderMaterial || !mainMaterial) return null;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* White border behind */}
      <mesh position={[0, 0, -0.001]} scale={1.1} renderOrder={0} geometry={sharedGeometries.stickerBase} material={borderMaterial} />
      {/* Main sticker */}
      <mesh renderOrder={1} geometry={sharedGeometries.stickerBase} material={mainMaterial} />
    </group>
  );
}

// Generate stable random sticker positions based on coin address
function generateStickerPosition(seed: string, index: number): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  isCircle: boolean;
} {
  // Simple hash function for deterministic randomness
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h;
  };

  const h = hash(seed + index.toString());
  const random = (offset: number) => {
    const x = Math.sin(h + offset) * 10000;
    return x - Math.floor(x);
  };

  // Distribute stickers only on left and right sides (back has static stickers)
  const faceSelector = random(0);
  let position: [number, number, number];
  let rotation: [number, number, number];

  if (faceSelector < 0.5) {
    // Left side (50% chance) - sticker faces outward (-X direction)
    const z = (random(1) - 0.5) * 0.7;
    const y = (random(2) - 0.5) * 1.2;
    position = [-1.21, y, z];
    rotation = [0, -Math.PI / 2, (random(3) - 0.5) * 0.3];
  } else {
    // Right side (50% chance) - sticker faces outward (+X direction)
    const z = (random(1) - 0.5) * 0.7;
    const y = (random(2) - 0.5) * 1.2;
    position = [1.21, y, z];
    rotation = [0, Math.PI / 2, (random(3) - 0.5) * 0.3];
  }

  return {
    position,
    rotation,
    scale: 0.6 + random(4) * 0.5, // 0.6 to 1.1
    isCircle: random(5) > 0.5,
  };
}

// Component to render dynamic stickers from creator coin images
interface DynamicStickersProps {
  items: CreatorCoinImage[];
  maxStickers?: number;
}

function DynamicStickers({ items, maxStickers = 8 }: DynamicStickersProps) {
  // Take up to maxStickers
  const stickerItems = useMemo(() => {
    console.log("[DynamicStickers] Received items:", items.length);
    const filtered = items.slice(0, maxStickers);

    if (filtered.length > 0) {
      console.log("[DynamicStickers] Rendering", filtered.length, "creator coin stickers:",
        filtered.map(i => `${i.symbol || i.coinAddress.slice(0, 8)} (${i.imageUrl.slice(0, 50)}...)`).join(", "));
    } else {
      console.log("[DynamicStickers] No stickers to render");
    }

    return filtered;
  }, [items, maxStickers]);

  return (
    <>
      {stickerItems.map((item, index) => {
        const props = generateStickerPosition(item.coinAddress, index);
        return (
          <DynamicSticker
            key={item.coinAddress}
            imageUrl={item.imageUrl}
            {...props}
          />
        );
      })}
    </>
  );
}

// Stickers wrapper component (static stickers on back of TV)
function TVStickers() {
  return (
    <Suspense fallback={null}>
      {/* Base logo - top left (back) */}
      <Sticker
        imagePath="/base-logo.png"
        position={[-0.65, 0.35, -0.46]}
        rotation={[0, Math.PI, 0.12]}
        scale={4}
        pixelSize={0.02}
        wearAmount={0.3}
      />
      {/* Gnars sticker - top right (back) */}
      <Sticker
        imagePath="/gnars.webp"
        position={[0.55, 0.4, -0.46]}
        rotation={[0, Math.PI, -0.1]}
        scale={1.3}
        pixelSize={0.02}
        wearAmount={0.4}
      />
      {/* Zorb sticker - bottom left (back) */}
      <Sticker
        imagePath="/Zorb.png"
        position={[-0.6, -0.35, -0.46]}
        rotation={[0, Math.PI, 0.08]}
        scale={1.5}
        pixelSize={0.025}
        wearAmount={0.6}
      />
      {/* Higher arrow - center (back) */}
      <Sticker
        imagePath="/higher-arrow.png"
        position={[0, 0, -0.46]}
        rotation={[0, Math.PI, 0.05]}
        scale={1.2}
        pixelSize={0.02}
        wearAmount={0.3}
      />
      {/* Skatehive - bottom right (back) */}
      <Sticker
        imagePath="/skatehive-logo.png"
        position={[0.6, -0.3, -0.46]}
        rotation={[0, Math.PI, -0.08]}
        scale={1.4}
        pixelSize={0.02}
        wearAmount={0.4}
      />
    </Suspense>
  );
}

export function TV3DModel({
  videoUrl: rawVideoUrl,
  autoRotate = true,
  rotationSpeed = 0.22,
  onNextVideo,
  textureConfig,
  creatorCoinImages = [],
}: TV3DModelProps) {
  const groupRef = useRef<Group>(null);
  const rotationTimeRef = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const [showStatic, setShowStatic] = useState(true); // Start with static/color bars
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | undefined>();
  const { invalidate } = useThree();

  // Use faster IPFS gateway
  const videoUrl = toFastIPFS(rawVideoUrl);

  // 24fps heartbeat - controls the entire animation rate
  // Uses setInterval for precise timing independent of render loop
  useEffect(() => {
    const intervalMs = 1000 / TARGET_FPS; // ~42ms for 24fps

    const tick = () => {
      if (document.visibilityState === "visible") {
        invalidate();
      }
    };

    const intervalId = setInterval(tick, intervalMs);
    // Trigger initial frame
    invalidate();

    return () => clearInterval(intervalId);
  }, [invalidate]);

  // Handle video URL changes with static transition
  useEffect(() => {
    if (videoUrl && videoUrl !== currentVideoUrl) {
      // Show static during transition (including first video load)
      setShowStatic(true);
      invalidate(); // Request render for static screen
      const timer = setTimeout(() => {
        setCurrentVideoUrl(videoUrl);
        setShowStatic(false);
        invalidate(); // Request render for video screen
      }, 800); // Static duration
      return () => clearTimeout(timer);
    }
  }, [videoUrl, currentVideoUrl, invalidate]);

  // Auto-advance after random 7-13 seconds
  useEffect(() => {
    if (!currentVideoUrl || showStatic) return;

    const randomDuration = 7 + Math.random() * 6; // 7 to 13 seconds
    const timer = setTimeout(() => {
      onNextVideo?.();
    }, randomDuration * 1000);

    return () => clearTimeout(timer);
  }, [currentVideoUrl, onNextVideo, showStatic]);

  useFrame(() => {
    // Skip animation when tab is hidden
    if (document.visibilityState !== "visible") return;

    if (groupRef.current && autoRotate) {
      // Calculate delta time manually for smooth animation
      const now = performance.now();
      const delta = (now - lastFrameTime.current) / 1000;
      lastFrameTime.current = now;

      // Update rotation based on elapsed time
      rotationTimeRef.current += delta * rotationSpeed;
      groupRef.current.rotation.y = Math.sin(rotationTimeRef.current) * MAX_OSCILLATION;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main cabinet with dynamic wood texture */}
      <WoodCabinet config={textureConfig?.wood} />

      {/* Bezel around screen - with rubber texture */}
      <DarkRubberPanel
        geometry={sharedGeometries.screenBezel}
        position={[-0.35, 0.05, 0.48]}
        baseColor={[0.35, 0.35, 0.35]}
        wearAmount={0.4}
      />

      {/* Inner screen bezel - slightly darker rubber texture */}
      <DarkRubberPanel
        geometry={sharedGeometries.innerBezel}
        position={[-0.35, 0.05, 0.5]}
        baseColor={[0.28, 0.28, 0.28]}
        wearAmount={0.2}
      />

      {/* Screen background */}
      <mesh position={[-0.35, 0.05, 0.52]} geometry={sharedGeometries.screen} material={sharedMaterials.screenBg} />

      {/* Video or Static Screen */}
      <group position={[-0.35, 0.05, 0]}>
        {showStatic ? (
          <ColorBarsScreen />
        ) : currentVideoUrl ? (
          <Suspense fallback={<ColorBarsScreen />}>
            <VideoScreen videoUrl={currentVideoUrl} />
          </Suspense>
        ) : (
          <FallbackScreen />
        )}
      </group>

      {/* Control panel with vintage plastic texture */}
      <VintagePlasticPanel
        geometry={sharedGeometries.controlPanel}
        position={[0.775, 0.05, 0.48]}
        config={textureConfig?.controlPanel}
      />

      {/* Colored buttons with plastic texture */}
      <PlasticButton
        geometry={sharedGeometries.button}
        position={[0.775, 0.35, 0.52]}
        rotation={[Math.PI / 2, 0, 0]}
        baseColor={[0.85, 0.25, 0.25]}
      />
      <PlasticButton
        geometry={sharedGeometries.button}
        position={[0.775, 0.18, 0.52]}
        rotation={[Math.PI / 2, 0, 0]}
        baseColor={[0.25, 0.70, 0.25]}
      />
      <PlasticButton
        geometry={sharedGeometries.button}
        position={[0.775, 0.01, 0.52]}
        rotation={[Math.PI / 2, 0, 0]}
        baseColor={[0.25, 0.45, 0.85]}
      />

      {/* Speaker grille with metallic texture */}
      <MetalGrill geometry={sharedGeometries.speakerLine} position={[0.775, -0.18, 0.5]} />
      <MetalGrill geometry={sharedGeometries.speakerLine} position={[0.775, -0.26, 0.5]} />
      <MetalGrill geometry={sharedGeometries.speakerLine} position={[0.775, -0.34, 0.5]} />
      <MetalGrill geometry={sharedGeometries.speakerLine} position={[0.775, -0.42, 0.5]} />

      {/* Indicator dots with dark rubber texture */}
      <DarkRubberPanel
        geometry={sharedGeometries.indicator}
        position={[-0.95, -0.6, 0.5]}
        baseColor={[0.25, 0.25, 0.25]}
        wearAmount={0.3}
      />
      <DarkRubberPanel
        geometry={sharedGeometries.indicator}
        position={[-0.82, -0.6, 0.5]}
        baseColor={[0.25, 0.25, 0.25]}
        wearAmount={0.3}
      />

      {/* Bottom base with dark wood texture */}
      <DarkWoodBase geometry={sharedGeometries.base} position={[0, -0.85, 0]} />

      {/* Antenna base with dark rubber texture */}
      <DarkRubberPanel
        geometry={sharedGeometries.antennaBase}
        position={[0, 0.88, 0]}
        baseColor={[0.18, 0.18, 0.18]}
        wearAmount={0.5}
      />

      {/* Left antenna with brushed metal texture */}
      <BrushedMetal
        geometry={sharedGeometries.antenna}
        position={[-0.25, 1.35, 0]}
        rotation={[0, 0, ROTATION_ANGLE]}
      />
      <BrushedMetal
        geometry={sharedGeometries.antennaTip}
        position={[-0.42, 1.75, 0]}
        rotation={[0, 0, ROTATION_ANGLE]}
        baseColor={[0.82, 0.82, 0.82]}
      />

      {/* Right antenna with brushed metal texture */}
      <BrushedMetal
        geometry={sharedGeometries.antenna}
        position={[0.25, 1.35, 0]}
        rotation={[0, 0, -ROTATION_ANGLE]}
      />
      <BrushedMetal
        geometry={sharedGeometries.antennaTip}
        position={[0.42, 1.75, 0]}
        rotation={[0, 0, -ROTATION_ANGLE]}
        baseColor={[0.82, 0.82, 0.82]}
      />

      {/* Stickers on TV body */}
      <TVStickers />

      {/* Dynamic stickers from creator coins that Gnars holds */}
      {creatorCoinImages.length > 0 && (
        <Suspense fallback={null}>
          <DynamicStickers items={creatorCoinImages} maxStickers={8} />
        </Suspense>
      )}
    </group>
  );
}
