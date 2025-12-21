"use client";

import { useRef, useEffect, useState, Suspense, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useVideoTexture, useTexture } from "@react-three/drei";
import type { Group } from "three";
import * as THREE from "three";
import type { TVTextureConfig, PlasticConfig } from "./TVTextureControls";

interface TV3DModelProps {
  videoUrl?: string;
  autoRotate?: boolean;
  rotationSpeed?: number;
  onNextVideo?: () => void;
  textureConfig?: TVTextureConfig;
}

// Pre-calculated constants
const ROTATION_ANGLE = Math.PI / 8;
const MAX_OSCILLATION = Math.PI / 12;

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

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
  }), [texture]);

  return (
    <mesh position={[0, 0, 0.521]} geometry={sharedGeometries.screen}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={crtVertexShader}
        fragmentShader={crtFragmentShader}
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

// Sticker component with texture
interface StickerProps {
  imagePath: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

function Sticker({ imagePath, position, rotation = [0, 0, 0], scale = 1 }: StickerProps) {
  const texture = useTexture(imagePath);

  // Ensure texture uses correct color space and premultiplied alpha
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = true;
  texture.needsUpdate = true;

  const baseSize = 0.25;

  return (
    <mesh position={position} rotation={rotation} scale={scale} renderOrder={1}>
      <planeGeometry args={[baseSize, baseSize]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        alphaTest={0.1}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Stickers wrapper component
function TVStickers() {
  return (
    <Suspense fallback={null}>
      {/* Gnars sticker - back of TV, left side */}
      <Sticker
        imagePath="/gnars.webp"
        position={[-0.5, 0.2, -0.46]}
        rotation={[0, Math.PI, 0.1]}
        scale={1.3}
      />
      {/* Zorb sticker - back of TV, right side */}
      <Sticker
        imagePath="/Zorb.png"
        position={[0.5, -0.2, -0.46]}
        rotation={[0, Math.PI, -0.15]}
        scale={1.5}
      />
    </Suspense>
  );
}

export function TV3DModel({
  videoUrl: rawVideoUrl,
  autoRotate = true,
  rotationSpeed = 0.2,
  onNextVideo,
  textureConfig,
}: TV3DModelProps) {
  const groupRef = useRef<Group>(null);
  const rotationTimeRef = useRef(0);
  const [showStatic, setShowStatic] = useState(true); // Start with static/color bars
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | undefined>();

  // Use faster IPFS gateway
  const videoUrl = toFastIPFS(rawVideoUrl);

  // Handle video URL changes with static transition
  useEffect(() => {
    if (videoUrl && videoUrl !== currentVideoUrl) {
      // Show static during transition (including first video load)
      setShowStatic(true);
      const timer = setTimeout(() => {
        setCurrentVideoUrl(videoUrl);
        setShowStatic(false);
      }, 800); // Static duration
      return () => clearTimeout(timer);
    }
  }, [videoUrl, currentVideoUrl]);

  // Auto-advance after random 7-13 seconds
  useEffect(() => {
    if (!currentVideoUrl || showStatic) return;

    const randomDuration = 7 + Math.random() * 6; // 7 to 13 seconds
    const timer = setTimeout(() => {
      onNextVideo?.();
    }, randomDuration * 1000);

    return () => clearTimeout(timer);
  }, [currentVideoUrl, onNextVideo, showStatic]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      rotationTimeRef.current += delta * rotationSpeed;
      groupRef.current.rotation.y = Math.sin(rotationTimeRef.current) * MAX_OSCILLATION;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main cabinet with dynamic wood texture */}
      <WoodCabinet config={textureConfig?.wood} />

      {/* Dark bezel around screen */}
      <mesh position={[-0.35, 0.05, 0.48]} geometry={sharedGeometries.screenBezel} material={sharedMaterials.darkBezel} />

      {/* Inner screen bezel */}
      <mesh position={[-0.35, 0.05, 0.5]} geometry={sharedGeometries.innerBezel} material={sharedMaterials.innerBezel} />

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

      {/* Colored buttons */}
      <mesh position={[0.775, 0.35, 0.52]} rotation={[Math.PI / 2, 0, 0]} geometry={sharedGeometries.button} material={sharedMaterials.buttonRed} />
      <mesh position={[0.775, 0.18, 0.52]} rotation={[Math.PI / 2, 0, 0]} geometry={sharedGeometries.button} material={sharedMaterials.buttonGreen} />
      <mesh position={[0.775, 0.01, 0.52]} rotation={[Math.PI / 2, 0, 0]} geometry={sharedGeometries.button} material={sharedMaterials.buttonBlue} />

      {/* Speaker grille */}
      <mesh position={[0.775, -0.18, 0.5]} geometry={sharedGeometries.speakerLine} material={sharedMaterials.speaker} />
      <mesh position={[0.775, -0.26, 0.5]} geometry={sharedGeometries.speakerLine} material={sharedMaterials.speaker} />
      <mesh position={[0.775, -0.34, 0.5]} geometry={sharedGeometries.speakerLine} material={sharedMaterials.speaker} />
      <mesh position={[0.775, -0.42, 0.5]} geometry={sharedGeometries.speakerLine} material={sharedMaterials.speaker} />

      {/* Indicator dots */}
      <mesh position={[-0.95, -0.6, 0.5]} geometry={sharedGeometries.indicator} material={sharedMaterials.indicator} />
      <mesh position={[-0.82, -0.6, 0.5]} geometry={sharedGeometries.indicator} material={sharedMaterials.indicator} />

      {/* Bottom base */}
      <mesh position={[0, -0.85, 0]} geometry={sharedGeometries.base} material={sharedMaterials.baseDark} />

      {/* Antenna base */}
      <mesh position={[0, 0.88, 0]} geometry={sharedGeometries.antennaBase} material={sharedMaterials.antennaBaseMat} />

      {/* Left antenna */}
      <mesh position={[-0.25, 1.35, 0]} rotation={[0, 0, ROTATION_ANGLE]} geometry={sharedGeometries.antenna} material={sharedMaterials.antennaMetal} />
      <mesh position={[-0.42, 1.75, 0]} rotation={[0, 0, ROTATION_ANGLE]} geometry={sharedGeometries.antennaTip} material={sharedMaterials.antennaTipMat} />

      {/* Right antenna */}
      <mesh position={[0.25, 1.35, 0]} rotation={[0, 0, -ROTATION_ANGLE]} geometry={sharedGeometries.antenna} material={sharedMaterials.antennaMetal} />
      <mesh position={[0.42, 1.75, 0]} rotation={[0, 0, -ROTATION_ANGLE]} geometry={sharedGeometries.antennaTip} material={sharedMaterials.antennaTipMat} />

      {/* Stickers on TV body */}
      <TVStickers />
    </group>
  );
}
