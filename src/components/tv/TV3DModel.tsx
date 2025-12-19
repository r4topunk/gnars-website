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

// Static color bars shader (no animation - much lighter)
const colorBarsShader = `
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 center = uv - 0.5;
    float dist = dot(center, center);

    // Slight barrel distortion
    uv = uv + center * dist * 0.08;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec3 color;
    float x = uv.x;

    // Classic SMPTE color bars
    if (x < 0.143) color = vec3(0.75, 0.75, 0.75);      // Gray
    else if (x < 0.286) color = vec3(0.75, 0.75, 0.0);  // Yellow
    else if (x < 0.429) color = vec3(0.0, 0.75, 0.75);  // Cyan
    else if (x < 0.571) color = vec3(0.0, 0.75, 0.0);   // Green
    else if (x < 0.714) color = vec3(0.75, 0.0, 0.75);  // Magenta
    else if (x < 0.857) color = vec3(0.75, 0.0, 0.0);   // Red
    else color = vec3(0.0, 0.0, 0.75);                  // Blue

    // Simple scanlines (static)
    float scanline = mod(gl_FragCoord.y, 3.0) < 1.0 ? 0.9 : 1.0;
    color *= scanline;

    // Vignette
    color *= 1.0 - dist * 1.2;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Color bars component - static, no useFrame for better performance
function ColorBarsScreen() {
  return (
    <mesh position={[0, 0, 0.521]}>
      <planeGeometry args={[1.15, 0.95]} />
      <shaderMaterial
        vertexShader={crtVertexShader}
        fragmentShader={colorBarsShader}
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
    <mesh position={[0, 0, 0.521]}>
      <planeGeometry args={[1.15, 0.95]} />
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
    <mesh position={[0, 0, 0.521]}>
      <planeGeometry args={[1.15, 0.95]} />
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

  // Auto-rotate with oscillation (±15 degrees from center)
  const maxAngle = Math.PI / 12;

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      rotationTimeRef.current += delta * rotationSpeed;
      groupRef.current.rotation.y = Math.sin(rotationTimeRef.current) * maxAngle;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main cabinet - brown wood sides */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.4, 1.6, 0.9]} />
        <meshStandardMaterial color="#8B5A2B" roughness={0.85} />
      </mesh>

      {/* Front panel - cream/beige */}
      <mesh position={[0, 0, 0.4]}>
        <boxGeometry args={[2.3, 1.5, 0.12]} />
        <meshStandardMaterial color="#E8DCC8" roughness={0.6} />
      </mesh>

      {/* White border frame */}
      <mesh position={[0, 0, 0.47]}>
        <boxGeometry args={[2.35, 1.55, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
      </mesh>

      {/* Screen area - left side */}
      {/* Dark bezel around screen */}
      <mesh position={[-0.35, 0.05, 0.48]}>
        <boxGeometry args={[1.4, 1.2, 0.04]} />
        <meshStandardMaterial color="#2C2C2C" roughness={0.9} />
      </mesh>

      {/* Inner screen bezel - darker */}
      <mesh position={[-0.35, 0.05, 0.5]}>
        <boxGeometry args={[1.25, 1.05, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
      </mesh>

      {/* Screen background */}
      <mesh position={[-0.35, 0.05, 0.52]}>
        <planeGeometry args={[1.15, 0.95]} />
        <meshBasicMaterial color="#000" />
      </mesh>

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

      {/* Right side control panel */}
      {/* Control panel background - slightly darker beige */}
      <mesh position={[0.85, 0.05, 0.48]}>
        <boxGeometry args={[0.55, 1.2, 0.04]} />
        <meshStandardMaterial color="#D4C4A8" roughness={0.7} />
      </mesh>

      {/* Colored buttons - Red, Green, Blue */}
      <mesh position={[0.85, 0.35, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.12, 0.06, 0.12]} />
        <meshStandardMaterial color="#CC3333" roughness={0.4} />
      </mesh>
      <mesh position={[0.85, 0.18, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.12, 0.06, 0.12]} />
        <meshStandardMaterial color="#33AA33" roughness={0.4} />
      </mesh>
      <mesh position={[0.85, 0.01, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.12, 0.06, 0.12]} />
        <meshStandardMaterial color="#3366CC" roughness={0.4} />
      </mesh>

      {/* Speaker grille - horizontal lines */}
      {[-0.18, -0.26, -0.34, -0.42].map((y, i) => (
        <mesh key={i} position={[0.85, y, 0.5]}>
          <boxGeometry args={[0.4, 0.04, 0.02]} />
          <meshStandardMaterial color="#A89070" roughness={0.8} />
        </mesh>
      ))}

      {/* Small indicator dots at bottom left of front panel */}
      <mesh position={[-0.95, -0.6, 0.5]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshStandardMaterial color="#333333" roughness={0.5} />
      </mesh>
      <mesh position={[-0.82, -0.6, 0.5]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshStandardMaterial color="#333333" roughness={0.5} />
      </mesh>

      {/* Bottom base - dark brown/black strip */}
      <mesh position={[0, -0.85, 0]}>
        <boxGeometry args={[2.4, 0.1, 0.9]} />
        <meshStandardMaterial color="#2A1F14" roughness={0.9} />
      </mesh>

      {/* Antenna base - black box on top */}
      <mesh position={[0, 0.88, 0]}>
        <boxGeometry args={[0.25, 0.12, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>

      {/* Left antenna */}
      <mesh position={[-0.25, 1.35, 0]} rotation={[0, 0, Math.PI / 8]}>
        <cylinderGeometry args={[0.025, 0.035, 0.9, 8]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Left antenna tip */}
      <mesh position={[-0.42, 1.75, 0]} rotation={[0, 0, Math.PI / 8]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#D0D0D0" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Right antenna */}
      <mesh position={[0.25, 1.35, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <cylinderGeometry args={[0.025, 0.035, 0.9, 8]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Right antenna tip */}
      <mesh position={[0.42, 1.75, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#D0D0D0" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}
