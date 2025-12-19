"use client";

import { useRef, useEffect, useState, Suspense, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useVideoTexture } from "@react-three/drei";
import type { Group } from "three";
import * as THREE from "three";

interface TV3DModelProps {
  videoUrl?: string;
  autoRotate?: boolean;
  rotationSpeed?: number;
  onNextVideo?: () => void;
  playDuration?: number;
}

// Pre-calculated constants
const ROTATION_ANGLE = Math.PI / 8;
const MAX_OSCILLATION = Math.PI / 12;

// Shared geometries (created once, reused)
const sharedGeometries = {
  cabinet: new THREE.BoxGeometry(2.4, 1.6, 0.9),
  frontPanel: new THREE.BoxGeometry(2.3, 1.5, 0.12),
  borderFrame: new THREE.BoxGeometry(2.35, 1.55, 0.02),
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
};

// Shared materials (using cheaper Lambert instead of Standard where possible)
const sharedMaterials = {
  wood: new THREE.MeshLambertMaterial({ color: "#8B5A2B" }),
  cream: new THREE.MeshLambertMaterial({ color: "#E8DCC8" }),
  white: new THREE.MeshLambertMaterial({ color: "#FFFFFF" }),
  darkBezel: new THREE.MeshLambertMaterial({ color: "#2C2C2C" }),
  innerBezel: new THREE.MeshLambertMaterial({ color: "#1a1a1a" }),
  screenBg: new THREE.MeshBasicMaterial({ color: "#000" }),
  controlPanel: new THREE.MeshLambertMaterial({ color: "#D4C4A8" }),
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

export function TV3DModel({
  videoUrl: rawVideoUrl,
  autoRotate = true,
  rotationSpeed = 0.2,
  onNextVideo,
  playDuration = 3,
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

  // Auto-advance after playDuration seconds
  useEffect(() => {
    if (!currentVideoUrl || showStatic) return;

    const timer = setTimeout(() => {
      onNextVideo?.();
    }, playDuration * 1000);

    return () => clearTimeout(timer);
  }, [currentVideoUrl, playDuration, onNextVideo, showStatic]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      rotationTimeRef.current += delta * rotationSpeed;
      groupRef.current.rotation.y = Math.sin(rotationTimeRef.current) * MAX_OSCILLATION;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main cabinet */}
      <mesh position={[0, 0, 0]} geometry={sharedGeometries.cabinet} material={sharedMaterials.wood} />

      {/* Front panel */}
      <mesh position={[0, 0, 0.4]} geometry={sharedGeometries.frontPanel} material={sharedMaterials.cream} />

      {/* White border frame */}
      <mesh position={[0, 0, 0.47]} geometry={sharedGeometries.borderFrame} material={sharedMaterials.white} />

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

      {/* Control panel */}
      <mesh position={[0.85, 0.05, 0.48]} geometry={sharedGeometries.controlPanel} material={sharedMaterials.controlPanel} />

      {/* Colored buttons */}
      <mesh position={[0.85, 0.35, 0.52]} rotation={[Math.PI / 2, 0, 0]} geometry={sharedGeometries.button} material={sharedMaterials.buttonRed} />
      <mesh position={[0.85, 0.18, 0.52]} rotation={[Math.PI / 2, 0, 0]} geometry={sharedGeometries.button} material={sharedMaterials.buttonGreen} />
      <mesh position={[0.85, 0.01, 0.52]} rotation={[Math.PI / 2, 0, 0]} geometry={sharedGeometries.button} material={sharedMaterials.buttonBlue} />

      {/* Speaker grille */}
      <mesh position={[0.85, -0.18, 0.5]} geometry={sharedGeometries.speakerLine} material={sharedMaterials.speaker} />
      <mesh position={[0.85, -0.26, 0.5]} geometry={sharedGeometries.speakerLine} material={sharedMaterials.speaker} />
      <mesh position={[0.85, -0.34, 0.5]} geometry={sharedGeometries.speakerLine} material={sharedMaterials.speaker} />
      <mesh position={[0.85, -0.42, 0.5]} geometry={sharedGeometries.speakerLine} material={sharedMaterials.speaker} />

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
    </group>
  );
}
