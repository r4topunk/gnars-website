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

// Convert ipfs.io URLs to faster gateway
function toFastIPFS(url?: string): string | undefined {
  if (!url) return undefined;
  return url
    .replace("https://ipfs.io/ipfs/", "https://dweb.link/ipfs/")
    .replace("https://cloudflare-ipfs.com/ipfs/", "https://dweb.link/ipfs/");
}

// Static noise texture generator
function createStaticTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);

  for (let i = 0; i < size * size * 4; i += 4) {
    const noise = Math.random() * 255;
    data[i] = noise;
    data[i + 1] = noise;
    data[i + 2] = noise;
    data[i + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  return texture;
}

// CRT shader for color bars with scanlines and curvature
const colorBarsCrtShader = `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // Barrel distortion (CRT curvature)
    vec2 uv = vUv;
    vec2 center = uv - 0.5;
    float dist = dot(center, center);
    uv = uv + center * dist * 0.1;

    // Check bounds
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec3 color;
    float x = uv.x;
    float y = uv.y;

    // Top part: color bars
    if (y > 0.3) {
      if (x < 0.125) color = vec3(1.0, 1.0, 1.0);
      else if (x < 0.25) color = vec3(1.0, 1.0, 0.0);
      else if (x < 0.375) color = vec3(0.0, 1.0, 1.0);
      else if (x < 0.5) color = vec3(0.0, 1.0, 0.0);
      else if (x < 0.625) color = vec3(1.0, 0.0, 1.0);
      else if (x < 0.75) color = vec3(1.0, 0.0, 0.0);
      else if (x < 0.875) color = vec3(0.0, 0.0, 1.0);
      else color = vec3(0.0, 0.0, 0.0);
    } else {
      // Bottom part: animated static noise
      float noise = fract(sin(dot(uv + uTime, vec2(12.9898, 78.233))) * 43758.5453);
      color = vec3(noise);
    }

    // Scanlines
    float scanline = sin(uv.y * 400.0) * 0.1;
    color -= scanline;

    // Vignette
    float vignette = 1.0 - dist * 1.5;
    color *= vignette;

    // Flickering effect
    float flicker = 0.97 + 0.03 * sin(uTime * 10.0);
    color *= flicker;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Color bars component (classic TV test pattern) with CRT effect
function ColorBarsScreen() {
  const timeRef = useRef(0);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  // Animate
  useFrame((_, delta) => {
    timeRef.current += delta;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = timeRef.current;
    }
  });

  return (
    <mesh position={[0, 0.1, 0.451]}>
      <planeGeometry args={[1.45, 1.05]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={crtVertexShader}
        fragmentShader={colorBarsCrtShader}
      />
    </mesh>
  );
}

// CRT Shader for retro TV effect
const crtVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const crtFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // Barrel distortion (CRT curvature)
    vec2 uv = vUv;
    vec2 center = uv - 0.5;
    float dist = dot(center, center);
    uv = uv + center * dist * 0.1;

    // Check bounds
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Sample texture
    vec4 color = texture2D(uTexture, uv);

    // Scanlines
    float scanline = sin(uv.y * 400.0) * 0.08;
    color.rgb -= scanline;

    // Vignette
    float vignette = 1.0 - dist * 1.5;
    color.rgb *= vignette;

    // Slight green/blue tint for old CRT look
    color.r *= 0.95;
    color.g *= 1.0;
    color.b *= 0.98;

    // Brightness boost
    color.rgb *= 1.1;

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
    uTime: { value: 0 },
  }), [texture]);

  // Update texture uniform when it changes
  useEffect(() => {
    uniforms.uTexture.value = texture;
  }, [texture, uniforms]);

  return (
    <mesh position={[0, 0.1, 0.451]}>
      <planeGeometry args={[1.45, 1.05]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={crtVertexShader}
        fragmentShader={crtFragmentShader}
      />
    </mesh>
  );
}

// Fallback screen when no video
function FallbackScreen() {
  return (
    <mesh position={[0, 0.1, 0.451]}>
      <planeGeometry args={[1.45, 1.05]} />
      <meshBasicMaterial color="#111" />
    </mesh>
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

  // Auto-rotate with oscillation (±30 degrees from center)
  const maxAngle = Math.PI / 6;

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      rotationTimeRef.current += delta * rotationSpeed;
      groupRef.current.rotation.y = Math.sin(rotationTimeRef.current) * maxAngle;
    }
  });

  return (
    <group ref={groupRef}>
      {/* TV Cabinet - Retro wood style */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 1.8, 0.8]} />
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
      </mesh>

      {/* TV Front panel */}
      <mesh position={[0, 0, 0.35]}>
        <boxGeometry args={[2.1, 1.7, 0.12]} />
        <meshStandardMaterial color="#5D4E37" roughness={0.7} />
      </mesh>

      {/* Screen bezel */}
      <mesh position={[0, 0.1, 0.42]}>
        <boxGeometry args={[1.6, 1.2, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </mesh>

      {/* Screen background */}
      <mesh position={[0, 0.1, 0.45]}>
        <planeGeometry args={[1.45, 1.05]} />
        <meshBasicMaterial color="#000" />
      </mesh>

      {/* Video or Static Screen */}
      {showStatic ? (
        <ColorBarsScreen />
      ) : currentVideoUrl ? (
        <Suspense fallback={<ColorBarsScreen />}>
          <VideoScreen videoUrl={currentVideoUrl} />
        </Suspense>
      ) : (
        <FallbackScreen />
      )}

      {/* Control panel */}
      <mesh position={[0, -0.65, 0.38]}>
        <boxGeometry args={[1.8, 0.25, 0.1]} />
        <meshStandardMaterial color="#5D4E37" roughness={0.7} />
      </mesh>

      {/* Knobs */}
      <mesh position={[-0.5, -0.65, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.65, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.5, -0.65, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.8, -1.05, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.15]} />
        <meshStandardMaterial color="#4A3728" roughness={0.8} />
      </mesh>
      <mesh position={[0.8, -1.05, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.15]} />
        <meshStandardMaterial color="#4A3728" roughness={0.8} />
      </mesh>
    </group>
  );
}
