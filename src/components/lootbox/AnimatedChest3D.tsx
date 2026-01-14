"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Group, PointLight, TextureLoader } from "three";
import * as THREE from "three";

interface ChestProps {
  onClick: () => void;
  isOpening: boolean;
  isPending: boolean;
  tier?: "bronze" | "silver" | "gold" | "black";
}

// Tier color schemes
const TIER_COLORS = {
  bronze: {
    primary: "#cd7f32",
    secondary: "#8b5a2b",
    accent: "#ffa500",
    emissive: "#cd7f32",
  },
  silver: {
    primary: "#c0c0c0",
    secondary: "#808080",
    accent: "#e8e8e8",
    emissive: "#a0a0a0",
  },
  gold: {
    primary: "#ffd700",
    secondary: "#b8860b",
    accent: "#ffec8b",
    emissive: "#ffd700",
  },
  black: {
    primary: "#1a1a1a",
    secondary: "#0d0d0d",
    accent: "#333333",
    emissive: "#1a1a1a",
  },
};

// Memoize static position arrays to prevent recreation
const SCREW_POSITIONS: [number, number, number][] = [
  [-1.1, 0.5, 0.8],
  [1.1, 0.5, 0.8],
  [-1.1, -0.5, 0.8],
  [1.1, -0.5, 0.8],
];

// Button state type
type ButtonState = "idle" | "hover" | "pressed" | "loading" | "success" | "disabled";

// Smoke Particles Component
const SmokeParticles = memo(({ isActive }: { isActive: boolean }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const particleCount = 150;

  // Create a circular texture for round particles
  const smokeTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    // Create radial gradient for soft round particle
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const { positions, velocities, lifetimes, sizes, opacities } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Start position - inside the box, more concentrated
      positions[i * 3] = (Math.random() - 0.5) * 1.2; // x - wider for heavier smoke
      positions[i * 3 + 1] = -0.6 + Math.random() * 0.3; // y - from bottom
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.0; // z - wider

      // Velocity - slower upward with more drift
      velocities[i * 3] = (Math.random() - 0.5) * 0.25; // x drift
      velocities[i * 3 + 1] = 0.25 + Math.random() * 0.35; // y upward (slower for denser smoke)
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.25; // z drift

      // Lifetime - staggered start
      lifetimes[i] = Math.random() * 4;

      // Size - varied and larger
      sizes[i] = 0.15 + Math.random() * 0.25;

      // Opacity
      opacities[i] = 0;
    }

    return { positions, velocities, lifetimes, sizes, opacities };
  }, []);

  useFrame((state, delta) => {
    if (!particlesRef.current || !isActive) return;

    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const sizeArray = particlesRef.current.geometry.attributes.size.array as Float32Array;
    const opacityArray = particlesRef.current.geometry.attributes.opacity.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const age = lifetimes[i];

      // Update position with turbulence
      const turbulence = Math.sin(state.clock.elapsedTime * 2 + i) * 0.1;
      posArray[idx] += (velocities[idx] + turbulence) * delta;
      posArray[idx + 1] += velocities[idx + 1] * delta;
      posArray[idx + 2] += (velocities[idx + 2] + turbulence * 0.5) * delta;

      // Update lifetime
      lifetimes[i] += delta;

      // Fade in/out based on age
      const maxLife = 4;
      if (age < 0.5) {
        // Fade in
        opacityArray[i] = age * 1.2;
      } else if (age > maxLife - 1) {
        // Fade out
        opacityArray[i] = (maxLife - age) * 0.6;
      } else {
        // Full opacity
        opacityArray[i] = 0.6;
      }

      // Grow size as particle ages
      sizeArray[i] = sizes[i] * (1 + age * 0.5);

      // Spread out horizontally as it rises
      const spreadFactor = age * 0.1;
      posArray[idx] += (posArray[idx] > 0 ? 1 : -1) * spreadFactor * delta;
      posArray[idx + 2] += (posArray[idx + 2] > 0 ? 1 : -1) * spreadFactor * delta;

      // Reset particle if it's too old or too high
      if (lifetimes[i] > maxLife || posArray[idx + 1] > 2.5) {
        posArray[idx] = (Math.random() - 0.5) * 1.2;
        posArray[idx + 1] = -0.6 + Math.random() * 0.3;
        posArray[idx + 2] = (Math.random() - 0.5) * 1.0;
        lifetimes[i] = 0;
        opacityArray[i] = 0;
        sizeArray[i] = sizes[i];
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    particlesRef.current.geometry.attributes.opacity.needsUpdate = true;
  });

  if (!isActive) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-opacity"
          count={particleCount}
          array={opacities}
          itemSize={1}
          args={[opacities, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.3}
        map={smokeTexture}
        color="#aaaaaa"
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.NormalBlending}
        vertexColors={false}
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            "attribute float size;",
            "attribute float size;\nattribute float opacity;",
          );
          shader.vertexShader = shader.vertexShader.replace(
            "gl_PointSize = size;",
            "gl_PointSize = size * opacity;",
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            "uniform float opacity;",
            "uniform float opacity;\nvarying float vOpacity;",
          );
          shader.vertexShader = shader.vertexShader.replace(
            "void main() {",
            "attribute float opacity;\nvarying float vOpacity;\nvoid main() {\nvOpacity = opacity;",
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            "gl_FragColor = vec4( outgoingLight, diffuseColor.a * opacity );",
            "gl_FragColor = vec4( outgoingLight, diffuseColor.a * opacity * vOpacity );",
          );
        }}
      />
    </points>
  );
});

SmokeParticles.displayName = "SmokeParticles";

const FuturisticCrate = memo(({ onClick, isOpening, isPending, tier = "bronze" }: ChestProps) => {
  const crateRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const interiorLightRef = useRef<PointLight>(null);
  const floatingLogoRef = useRef<Group>(null);
  const interiorGlowRef = useRef<THREE.MeshBasicMaterial>(null);
  const logoGlowRef = useRef<THREE.MeshBasicMaterial>(null);
  
  // Get tier colors
  const tierColors = TIER_COLORS[tier];

  // Load Gnars logo texture for floating interior logo

  // Load red noggles texture for lid decal

  // Load Gnars logo 3D model for button
  const gnarsLogoModel = useGLTF("/models/gnars-logo.glb");
  
  // Clone the model scene to allow multiple instances
  const clonedLogoScene = useMemo(() => {
    return gnarsLogoModel.scene.clone();
  }, [gnarsLogoModel.scene]);

  // Load metal plate textures from Polyhaven
  const metalColorMap = useLoader(
    TextureLoader,
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron/corrugated_iron_diff_1k.jpg",
  );
  const metalRoughnessMap = useLoader(
    TextureLoader,
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron/corrugated_iron_rough_1k.jpg",
  );
  const metalNormalMap = useLoader(
    TextureLoader,
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron/corrugated_iron_nor_gl_1k.jpg",
  );

  // Configure textures for proper decal rendering
  useEffect(() => {
    // Configure metal plate textures
    if (metalColorMap) {
      metalColorMap.colorSpace = THREE.SRGBColorSpace;
      metalColorMap.wrapS = metalColorMap.wrapT = THREE.RepeatWrapping;
      metalColorMap.repeat.set(2, 2);
      metalColorMap.anisotropy = 8;
      metalColorMap.needsUpdate = true;
    }
    if (metalNormalMap) {
      metalNormalMap.colorSpace = THREE.LinearSRGBColorSpace;
      metalNormalMap.wrapS = metalNormalMap.wrapT = THREE.RepeatWrapping;
      metalNormalMap.repeat.set(2, 2);
      metalNormalMap.anisotropy = 8;
      metalNormalMap.needsUpdate = true;
    }
    if (metalRoughnessMap) {
      metalRoughnessMap.colorSpace = THREE.LinearSRGBColorSpace;
      metalRoughnessMap.wrapS = metalRoughnessMap.wrapT = THREE.RepeatWrapping;
      metalRoughnessMap.repeat.set(2, 2);
      metalRoughnessMap.anisotropy = 8;
      metalRoughnessMap.needsUpdate = true;
    }

    // Apply metal texture to cloned Gnars logo GLB model materials
    if (clonedLogoScene && metalColorMap && metalNormalMap && metalRoughnessMap) {
      clonedLogoScene.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          // Clone material to avoid sharing between instances
          const material = (mesh.material as THREE.MeshStandardMaterial).clone();
          mesh.material = material;
          // Update material to use metal textures (works for both MeshStandardMaterial and MeshPhysicalMaterial)
          if (material.isMeshStandardMaterial) {
            material.map = metalColorMap;
            material.normalMap = metalNormalMap;
            material.roughnessMap = metalRoughnessMap;
            material.metalness = 0.95;
            material.roughness = 0.25;
            material.needsUpdate = true;
          }
        }
      });
    }
  }, [metalColorMap, metalNormalMap, metalRoughnessMap, clonedLogoScene]);

  // Hover state - real state instead of ref+forceUpdate for proper reactivity
  const [hovered, setHovered] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);

  // Animation refs - use refs instead of state to avoid per-frame re-renders
  const openProgressRef = useRef(0);
  const pulseRef = useRef(0.5);
  const loadingRotationRef = useRef(0);

  // State only for conditional rendering threshold (not updated per-frame)
  const [showLogo, setShowLogo] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>("idle");

  // Track pointer position for button click vs drag detection
  const buttonPointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const buttonIsDragging = useRef(false);

  const handleButtonPointerDown = useCallback((e: PointerEvent) => {
    e.stopPropagation();
    buttonPointerDownPos.current = { x: e.clientX, y: e.clientY };
    buttonIsDragging.current = false;
  }, []);

  const handleButtonPointerMove = useCallback((e: PointerEvent) => {
    if (buttonPointerDownPos.current) {
      const dx = e.clientX - buttonPointerDownPos.current.x;
      const dy = e.clientY - buttonPointerDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 3) {
        // Small threshold for button
        buttonIsDragging.current = true;
      }
    }
  }, []);

  const handleButtonClick = useCallback(
    (e: PointerEvent) => {
      e.stopPropagation();
      if (!buttonIsDragging.current) {
        onClick();
      }
      buttonPointerDownPos.current = null;
      buttonIsDragging.current = false;
    },
    [onClick],
  );

  // Pointer handlers - use real state updates for proper React reactivity
  const handlePointerOver = useCallback(() => {
    setHovered(true);
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
  }, []);

  const handleButtonPointerOver = useCallback(() => {
    setButtonHovered(true);
  }, []);

  const handleButtonPointerOut = useCallback(() => {
    setButtonHovered(false);
  }, []);

  // Sync button state with transaction state - deterministic based on all inputs
  useEffect(() => {
    // Priority order: pending > opening > hover > idle (disabled handled by parent)
    if (isPending) {
      setButtonState("loading");
    } else if (isOpening) {
      setButtonState("success");
    } else if (buttonHovered) {
      setButtonState("hover");
    } else {
      setButtonState("idle");
    }
  }, [isPending, isOpening, buttonHovered]); // Now includes buttonHovered for proper reactivity

  // Cursor management - centralized in useEffect instead of scattered in handlers
  useEffect(() => {
    const cursor = buttonHovered ? "pointer" : "auto";
    document.body.style.cursor = cursor;
    return () => {
      document.body.style.cursor = "auto"; // Cleanup on unmount
    };
  }, [buttonHovered]);

  // Idle animation - shaking effect when not hovered
  useFrame((state) => {
    if (!crateRef.current) return;

    const time = state.clock.getElapsedTime();

    if (!hovered && !buttonHovered) {
      // Shake animation - like something inside wants to come out
      const shakeFastFreq = 8.0; // Fast vibration
      const shakeSlowFreq = 2.0; // Slower "rattle"

      // Combine fast and slow shakes for more organic feel
      const shakeX =
        Math.sin(time * shakeFastFreq) * 0.015 + Math.sin(time * shakeSlowFreq * 0.7) * 0.008;
      const shakeY =
        Math.cos(time * shakeFastFreq * 1.3) * 0.02 + Math.sin(time * shakeSlowFreq) * 0.01;
      const shakeZ = Math.sin(time * shakeFastFreq * 0.9) * 0.012;

      crateRef.current.position.x = shakeX;
      crateRef.current.position.y = shakeY;
      crateRef.current.position.z = shakeZ;

      // Slight rotation shake
      crateRef.current.rotation.x = Math.sin(time * shakeFastFreq * 1.1) * 0.02;
      crateRef.current.rotation.z = Math.cos(time * shakeFastFreq * 0.8) * 0.015;
    } else {
      // Static when hovered (crate or button) - smoothly return to center
      crateRef.current.position.x += (0 - crateRef.current.position.x) * 0.1;
      crateRef.current.position.y += (0 - crateRef.current.position.y) * 0.1;
      crateRef.current.position.z += (0 - crateRef.current.position.z) * 0.1;
      crateRef.current.rotation.x += (0 - crateRef.current.rotation.x) * 0.1;
      crateRef.current.rotation.z += (0 - crateRef.current.rotation.z) * 0.1;
    }

    // Opening/closing animation - lid rotates backward around hinges WITH EASING
    if (lidRef.current) {
      let targetRotation = 0; // Closed position
      const maxRotation = Math.PI / 1.8; // -100 degrees when fully open

      if (isPending) {
        // Stage 1: Opens MORE (69 degrees) so interior is visible during pending - breaks "second lid" illusion
        targetRotation = -Math.PI / 2.6; // -69 degrees (was -45)
      } else if (isOpening) {
        // Stage 2: Fully open (100 degrees) when transaction confirmed
        targetRotation = -maxRotation; // -100 degrees
      }
      // When both are false, it closes (targetRotation = 0)

      // Smooth rotation animation with easing
      const currentRotation = lidRef.current.rotation.x;
      const rotationDiff = targetRotation - currentRotation;

      if (Math.abs(rotationDiff) > 0.001) {
        // Apply easing for smooth, premium feel
        const easingFactor = 0.08; // Lower = smoother, higher = faster
        const easedDiff = rotationDiff * easingFactor;
        lidRef.current.rotation.x += easedDiff;

        // Calculate progress (0-1) - use ref instead of setState to avoid per-frame re-renders
        const currentProgress = Math.abs(lidRef.current.rotation.x) / maxRotation;
        openProgressRef.current = Math.min(Math.max(currentProgress, 0), 1);

        // Only update state when threshold crossed (for conditional logo rendering)
        const shouldShowLogo = openProgressRef.current > 0.2;
        if (shouldShowLogo !== showLogo) {
          setShowLogo(shouldShowLogo);
        }
      }
    }

    // Hover lights removed

    // Animate interior light with GAMMA CURVE for dramatic reveal - use ref instead of state
    if (interiorLightRef.current) {
      // Use gamma-like curve for dramatic ramp: slow start, fast middle, slow end
      const lightCurve = Math.pow(openProgressRef.current, 2.2);
      const targetIntensity = lightCurve * 12.0; // 0 → 12 smoothly (increased from 8)

      // Smooth transition
      const currentIntensity = interiorLightRef.current.intensity;
      if (Math.abs(currentIntensity - targetIntensity) > 0.05) {
        interiorLightRef.current.intensity += (targetIntensity - currentIntensity) * 0.15;
      }
    }

    // Animate interior glow plane opacity
    if (interiorGlowRef.current) {
      const glowOpacity = openProgressRef.current * 0.4; // Max 40% opacity
      interiorGlowRef.current.opacity = glowOpacity;
    }

    // Animate floating Gnars logo (magical item effect) - use ref instead of state
    if (floatingLogoRef.current && openProgressRef.current > 0.3) {
      const time = state.clock.getElapsedTime();

      // Spinning rotation (Y-axis) - like a legendary item
      floatingLogoRef.current.rotation.y = time * 1.2; // Smooth constant spin

      // Floating up/down animation
      const floatAmplitude = 0.15; // How high it floats
      const floatSpeed = 1.5; // Speed of bobbing
      floatingLogoRef.current.position.y = Math.sin(time * floatSpeed) * floatAmplitude;

      // Slight tilt/wobble for more dynamic feel
      floatingLogoRef.current.rotation.x = Math.sin(time * 0.8) * 0.08;
      floatingLogoRef.current.rotation.z = Math.cos(time * 0.6) * 0.06;

      // Pulsing glow effect on logo sphere
      if (logoGlowRef.current) {
        const pulseGlow = 0.3 + Math.sin(time * 2) * 0.15; // Pulse between 0.15 and 0.45
        logoGlowRef.current.opacity = pulseGlow;
      }
    }

    // Button pulse animation for loading state - use refs instead of setState to avoid per-frame re-renders
    if (buttonState === "loading") {
      const time = state.clock.getElapsedTime();
      const pulseSpeed = 2.0; // Hz for loading pulse
      pulseRef.current = 0.5 + Math.sin(time * pulseSpeed * Math.PI) * 0.5;
      loadingRotationRef.current = time * 2; // Rotate loading indicator
    }
  });

  return (
    <group ref={crateRef} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
      {/* Main metallic base body - 5 faces (NO TOP - lid is the top) */}

      {/* Bottom face */}
      <mesh position={[0, -0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.1, 1.8]} />
        <meshStandardMaterial
          color={tierColors.primary}
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Front face (facing camera) */}
      <mesh position={[0, 0, 0.9]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 1.2, 0.1]} />
        <meshStandardMaterial
          color={tierColors.primary}
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Back face */}
      <mesh position={[0, 0, -0.9]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 1.2, 0.1]} />
        <meshStandardMaterial
          color={tierColors.primary}
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Left face */}
      <mesh position={[-1.25, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 1.2, 1.8]} />
        <meshStandardMaterial
          color={tierColors.primary}
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Right face */}
      <mesh position={[1.25, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 1.2, 1.8]} />
        <meshStandardMaterial
          color={tierColors.primary}
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* NO TOP FACE - lid serves as the top */}

      {/* Tier accent lights - from top left corner */}
      <pointLight
        position={[-2.5, 2.5, 1.5]}
        color={tierColors.accent}
        intensity={3.0}
        distance={8}
        decay={2}
      />
      <pointLight
        position={[-1.5, 1.8, 0.5]}
        color={tierColors.emissive}
        intensity={1.5}
        distance={5}
        decay={2}
      />

      {/* Bottom edge glow strips - enhanced with thicker strips */}
      <mesh position={[0, -0.55, 0.92]}>
        <boxGeometry args={[2.4, 0.03, 0.03]} />
        <meshStandardMaterial
          color={tierColors.accent}
          emissive={tierColors.emissive}
          emissiveIntensity={2.5}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[-1.24, -0.55, 0]}>
        <boxGeometry args={[0.03, 0.03, 1.8]} />
        <meshStandardMaterial
          color={tierColors.accent}
          emissive={tierColors.emissive}
          emissiveIntensity={2.5}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[1.24, -0.55, 0]}>
        <boxGeometry args={[0.03, 0.03, 1.8]} />
        <meshStandardMaterial
          color={tierColors.accent}
          emissive={tierColors.emissive}
          emissiveIntensity={2.5}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      {/* Back edge glow strip */}
      <mesh position={[0, -0.55, -0.92]}>
        <boxGeometry args={[2.4, 0.03, 0.03]} />
        <meshStandardMaterial
          color={tierColors.accent}
          emissive={tierColors.emissive}
          emissiveIntensity={2.0}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>

      {/* Subtle weathering overlay on body */}
      <mesh position={[0.5, 0.2, 0.91]}>
        <boxGeometry args={[0.8, 0.5, 0.01]} />
        <meshStandardMaterial
          color="#5a5a5a"
          metalness={0.7}
          roughness={0.5}
          transparent
          opacity={0.3}
        />
      </mesh>
      <mesh position={[-0.6, -0.3, 0.91]}>
        <boxGeometry args={[0.6, 0.4, 0.01]} />
        <meshStandardMaterial
          color="#555555"
          metalness={0.7}
          roughness={0.5}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Worn edge strips - moved down to avoid lid illusion */}
      <mesh position={[0, 0.54, 0.9]}>
        <boxGeometry args={[2.52, 0.03, 0.03]} />
        <meshStandardMaterial color="#666666" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.54, -0.9]}>
        <boxGeometry args={[2.52, 0.03, 0.03]} />
        <meshStandardMaterial color="#666666" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Panel details on front face - darker with more depth */}
      <mesh position={[0, 0, 0.91]}>
        <boxGeometry args={[2.3, 1.0, 0.05]} />
        <meshStandardMaterial
          color="#3a3a3a"
          metalness={0.9}
          roughness={0.35}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Inset panel lines - front with varied textures */}
      <mesh position={[-0.8, 0.3, 0.92]}>
        <boxGeometry args={[0.6, 0.4, 0.02]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh position={[0.8, 0.3, 0.92]}>
        <boxGeometry args={[0.6, 0.4, 0.02]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh position={[-0.8, -0.3, 0.92]}>
        <boxGeometry args={[0.6, 0.4, 0.02]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh position={[0.8, -0.3, 0.92]}>
        <boxGeometry args={[0.6, 0.4, 0.02]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.5} />
      </mesh>

      {/* Orange accent lights removed */}

      {/* Rivets on front panels */}
      {[
        [-1.0, 0.5, 0.93],
        [-0.6, 0.5, 0.93],
        [-1.0, 0.1, 0.93],
        [-0.6, 0.1, 0.93],
        [0.6, 0.5, 0.93],
        [1.0, 0.5, 0.93],
        [0.6, 0.1, 0.93],
        [1.0, 0.1, 0.93],
        [-1.0, -0.1, 0.93],
        [-0.6, -0.1, 0.93],
        [-1.0, -0.5, 0.93],
        [-0.6, -0.5, 0.93],
        [0.6, -0.1, 0.93],
        [1.0, -0.1, 0.93],
        [0.6, -0.5, 0.93],
        [1.0, -0.5, 0.93],
      ].map((pos, i) => (
        <mesh key={`rivet-${i}`} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.02, 0.02, 0.01, 8]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}

      {/* Hazard stripes - bottom left */}
      <group position={[-0.9, -0.5, 0.85]}>
        <mesh>
          <boxGeometry args={[0.4, 0.15, 0.05]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[-0.1, 0, 0.02]}>
          <boxGeometry args={[0.05, 0.15, 0.02]} />
          <meshStandardMaterial color="#ffcc00" metalness={0.2} roughness={0.4} />
        </mesh>
        <mesh position={[0.0, 0, 0.02]}>
          <boxGeometry args={[0.05, 0.15, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 0, 0.02]}>
          <boxGeometry args={[0.05, 0.15, 0.02]} />
          <meshStandardMaterial color="#ffcc00" metalness={0.2} roughness={0.4} />
        </mesh>
      </group>

      {/* Hazard stripes - bottom right */}
      <group position={[0.9, -0.5, 0.85]}>
        <mesh>
          <boxGeometry args={[0.4, 0.15, 0.05]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[-0.1, 0, 0.02]}>
          <boxGeometry args={[0.05, 0.15, 0.02]} />
          <meshStandardMaterial color="#ffcc00" metalness={0.2} roughness={0.4} />
        </mesh>
        <mesh position={[0.0, 0, 0.02]}>
          <boxGeometry args={[0.05, 0.15, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 0, 0.02]}>
          <boxGeometry args={[0.05, 0.15, 0.02]} />
          <meshStandardMaterial color="#ffcc00" metalness={0.2} roughness={0.4} />
        </mesh>
      </group>

      {/* Side panel details - left */}
      <mesh position={[-1.26, 0.2, 0]}>
        <boxGeometry args={[0.05, 0.6, 1.2]} />
        <meshStandardMaterial color="#252525" metalness={0.85} roughness={0.4} />
      </mesh>
      <mesh position={[-1.25, 0, 0.5]}>
        <boxGeometry args={[0.03, 0.8, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.6} />
      </mesh>
      <mesh position={[-1.25, 0, -0.5]}>
        <boxGeometry args={[0.03, 0.8, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.6} />
      </mesh>

      {/* Side panel details - right */}
      <mesh position={[1.26, 0.2, 0]}>
        <boxGeometry args={[0.05, 0.6, 1.2]} />
        <meshStandardMaterial color="#252525" metalness={0.85} roughness={0.4} />
      </mesh>
      <mesh position={[1.25, 0, 0.5]}>
        <boxGeometry args={[0.03, 0.8, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.6} />
      </mesh>
      <mesh position={[1.25, 0, -0.5]}>
        <boxGeometry args={[0.03, 0.8, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.6} />
      </mesh>

      {/* Back panel details */}
      <mesh position={[0, 0, -0.91]}>
        <boxGeometry args={[2.3, 1.0, 0.05]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.85} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, -0.92]}>
        <boxGeometry args={[1.8, 0.7, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.6} />
      </mesh>

      {/* INTERIOR OF THE BOX */}
      {/* Interior cavity - visible when lid opens */}
      {openProgressRef.current > 0.1 && (
        <group position={[0, 0, 0]}>
          {/* Bottom interior surface - LOWERED to create visible depth, not flat lid illusion */}
          <mesh position={[0, -0.7, 0]} receiveShadow>
            <boxGeometry args={[2.3, 0.1, 1.6]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.1} roughness={0.9} />
          </mesh>

          {/* Interior side walls - left */}
          <mesh position={[-1.15, 0, 0]} receiveShadow>
            <boxGeometry args={[0.1, 1.0, 1.6]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
          </mesh>

          {/* Interior side walls - right */}
          <mesh position={[1.15, 0, 0]} receiveShadow>
            <boxGeometry args={[0.1, 1.0, 1.6]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
          </mesh>

          {/* Interior back wall */}
          <mesh position={[0, 0, -0.75]} receiveShadow>
            <boxGeometry args={[2.3, 1.0, 0.1]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
          </mesh>

          {/* Interior front wall - REDUCED height + LOWERED to read as lip, not lid */}
          <mesh position={[0, -0.45, 0.75]} receiveShadow>
            <boxGeometry args={[2.3, 0.25, 0.1]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
          </mesh>

          {/* Subtle vertical rib on back wall - creates depth shadow cue */}
          <mesh position={[0, -0.2, -0.76]} receiveShadow castShadow>
            <boxGeometry args={[0.08, 0.6, 0.02]} />
            <meshStandardMaterial color="#050505" metalness={0.2} roughness={0.95} />
          </mesh>

          {/* Foam padding inserts - LOWERED to match new bottom depth */}
          <mesh position={[0, -0.65, 0]}>
            <boxGeometry args={[2.2, 0.05, 1.5]} />
            <meshStandardMaterial color="#2a2200" metalness={0.0} roughness={1.0} />
          </mesh>

          {/* Interior point light - dramatic reveal */}
          <pointLight
            ref={interiorLightRef}
            position={[0, 0, 0]}
            color={tierColors.accent}
            intensity={0}
            distance={4}
            decay={2}
          />

          {/* Interior glow planes */}
          <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2, 1.4]} />
            <meshBasicMaterial
              ref={interiorGlowRef}
              color={tierColors.emissive}
              transparent
              opacity={0}
            />
          </mesh>

          {/* Smoke particles coming from interior */}
          <SmokeParticles isActive={isPending || isOpening} />

          {/* FLOATING 3D GNARS LOGO - Legendary Item Effect */}
          {/* Conditional rendering based on showLogo state (updated only when threshold crossed) */}
          {showLogo && (
            <group ref={floatingLogoRef} position={[0, 0.1, 0.3]}>
              {/* Glow sphere behind logo */}
              <mesh position={[0, 0, -0.1]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial
                  ref={logoGlowRef}
                  color={tierColors.emissive}
                  transparent
                  opacity={0.3}
                />
              </mesh>

              {/* Inner glow */}
              <pointLight
                position={[0, 0, 0]}
                color={tierColors.accent}
                intensity={3}
                distance={2.5}
                decay={2}
              />
            </group>
          )}
        </group>
      )}
      {/* Bottom feet - 4 corner supports */}
      {[
        [-1.0, -0.65, 0.7],
        [1.0, -0.65, 0.7],
        [-1.0, -0.65, -0.7],
        [1.0, -0.65, -0.7],
      ].map((pos, i) => (
        <group key={`foot-${i}`} position={pos as [number, number, number]}>
          <mesh>
            <boxGeometry args={[0.2, 0.1, 0.2]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Rubber/grip pad on bottom */}
          <mesh position={[0, -0.055, 0]}>
            <boxGeometry args={[0.18, 0.01, 0.18]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Horizontal reinforcement band around base - ONLY BOTTOM BAND
          REMOVED: Top band at y=0.3 was causing "second lid" effect when looking into opened box.
          The top band (2.52×0.06×1.83) spanned the full box width/depth and appeared as a flat
          surface blocking the interior view. Bottom band at y=-0.3 provides sufficient detail. */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[2.52, 0.06, 1.83]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.25} />
      </mesh>

      {/* Ventilation grilles on sides for detail */}
      {/* Left side vent */}
      <group position={[-1.27, 0, 0]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`vent-left-${i}`} position={[0, -0.3 + i * 0.15, 0]}>
            <boxGeometry args={[0.02, 0.08, 1.2]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.5} />
          </mesh>
        ))}
      </group>
      {/* Right side vent */}
      <group position={[1.27, 0, 0]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`vent-right-${i}`} position={[0, -0.3 + i * 0.15, 0]}>
            <boxGeometry args={[0.02, 0.08, 1.2]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Canvas/Tarp Lid - animated group - pivot at hinges (back edge) */}
      <group ref={lidRef} position={[0, 0.6, -0.95]}>
        {/* Offset group to position lid correctly when rotated */}
        <group position={[0, 0, 0.95]}>
          {/* Main lid body - THINNER (0.12 not 0.3) so underside doesn't read as "second lid" */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.6, 0.12, 1.9]} />
            <meshStandardMaterial
              color={tierColors.primary}
              map={metalColorMap}
              normalMap={metalNormalMap}
              roughnessMap={metalRoughnessMap}
              metalness={0.85}
              roughness={0.4}
              envMapIntensity={2.0}
            />
          </mesh>

          {/* Metallic reinforcement edges on lid - thicker and more prominent */}
          <mesh position={[1.28, 0, 0]}>
            <boxGeometry args={[0.08, 0.32, 1.95]} />
            <meshStandardMaterial
              color={tierColors.secondary}
              map={metalColorMap}
              normalMap={metalNormalMap}
              roughnessMap={metalRoughnessMap}
              metalness={0.85}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[-1.28, 0, 0]}>
            <boxGeometry args={[0.08, 0.32, 1.95]} />
            <meshStandardMaterial
              color={tierColors.secondary}
              map={metalColorMap}
              normalMap={metalNormalMap}
              roughnessMap={metalRoughnessMap}
              metalness={0.85}
              roughness={0.4}
            />
          </mesh>
          {/* Front and back metal bands on lid */}
          <mesh position={[0, 0, 0.94]}>
            <boxGeometry args={[2.5, 0.32, 0.08]} />
            <meshStandardMaterial
              color={tierColors.secondary}
              map={metalColorMap}
              normalMap={metalNormalMap}
              roughnessMap={metalRoughnessMap}
              metalness={0.85}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 0, -0.94]}>
            <boxGeometry args={[2.5, 0.32, 0.08]} />
            <meshStandardMaterial
              color={tierColors.secondary}
              map={metalColorMap}
              normalMap={metalNormalMap}
              roughnessMap={metalRoughnessMap}
              metalness={0.85}
              roughness={0.4}
            />
          </mesh>

          {/* Corner brackets on lid */}
          {[
            [-1.25, 0, 0.92],
            [1.25, 0, 0.92],
            [-1.25, 0, -0.92],
            [1.25, 0, -0.92],
          ].map((pos, i) => (
            <mesh key={`lid-corner-${i}`} position={pos as [number, number, number]}>
              <boxGeometry args={[0.1, 0.34, 0.1]} />
              <meshStandardMaterial
                map={metalColorMap}
                normalMap={metalNormalMap}
                roughnessMap={metalRoughnessMap}
                metalness={0.85}
                roughness={0.4}
              />
            </mesh>
          ))}

          {/* Hinge details at the back of lid */}
          {[-0.7, 0, 0.7].map((xPos, i) => (
            <group key={`hinge-${i}`} position={[xPos, -0.15, -0.94]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.2, 12]} />
                <meshStandardMaterial
                  map={metalColorMap}
                  normalMap={metalNormalMap}
                  roughnessMap={metalRoughnessMap}
                  metalness={0.85}
                  roughness={0.4}
                />
              </mesh>
              {/* Hinge brackets */}
              <mesh position={[0, 0, 0.08]}>
                <boxGeometry args={[0.08, 0.12, 0.04]} />
                <meshStandardMaterial
                  map={metalColorMap}
                  normalMap={metalNormalMap}
                  roughnessMap={metalRoughnessMap}
                  metalness={0.85}
                  roughness={0.4}
                />
              </mesh>
              <mesh position={[0, 0, -0.08]}>
                <boxGeometry args={[0.08, 0.12, 0.04]} />
                <meshStandardMaterial
                  map={metalColorMap}
                  normalMap={metalNormalMap}
                  roughnessMap={metalRoughnessMap}
                  metalness={0.85}
                  roughness={0.4}
                />
              </mesh>
            </group>
          ))}

          {/* Lid latch receiver at front */}
          <mesh position={[0, -0.15, 0.94]}>
            <boxGeometry args={[0.3, 0.08, 0.05]} />
            <meshStandardMaterial
              map={metalColorMap}
              normalMap={metalNormalMap}
              roughnessMap={metalRoughnessMap}
              metalness={0.85}
              roughness={0.4}
            />
          </mesh>

          {/* Lid underside glow strips - visible when lid opens */}
          <mesh position={[0, -0.07, 0.93]}>
            <boxGeometry args={[2.3, 0.02, 0.02]} />
            <meshStandardMaterial
              color={tierColors.accent}
              emissive={tierColors.emissive}
              emissiveIntensity={2.0}
              metalness={0.2}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[-1.23, -0.07, 0]}>
            <boxGeometry args={[0.02, 0.02, 1.8]} />
            <meshStandardMaterial
              color={tierColors.accent}
              emissive={tierColors.emissive}
              emissiveIntensity={1.5}
              metalness={0.2}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[1.23, -0.07, 0]}>
            <boxGeometry args={[0.02, 0.02, 1.8]} />
            <meshStandardMaterial
              color={tierColors.accent}
              emissive={tierColors.emissive}
              emissiveIntensity={1.5}
              metalness={0.2}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>

      {/* Metal corner protectors - 8 corners */}
      {[
        // Bottom 4 corners
        [-1.25, -0.6, 0.9],
        [1.25, -0.6, 0.9],
        [-1.25, -0.6, -0.9],
        [1.25, -0.6, -0.9],
        // Top 4 corners (on base, below lid)
        [-1.25, 0.6, 0.9],
        [1.25, 0.6, 0.9],
        [-1.25, 0.6, -0.9],
        [1.25, 0.6, -0.9],
      ].map((pos, i) => (
        <group key={`corner-${i}`} position={pos as [number, number, number]}>
          {/* Corner protector - L shape */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 0.15, 0.08]} />
            <meshStandardMaterial
              map={metalColorMap}
              normalMap={metalNormalMap}
              roughnessMap={metalRoughnessMap}
              metalness={0.85}
              roughness={0.4}
            />
          </mesh>
          {/* Corner detail */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.06, 0.17, 0.06]} />
            <meshStandardMaterial
              map={metalColorMap}
              normalMap={metalNormalMap}
              roughnessMap={metalRoughnessMap}
              metalness={0.85}
              roughness={0.4}
            />
          </mesh>
        </group>
      ))}

      {/* Vertical metal bands wrapping around the crate */}
      {/* Left band */}
      <mesh position={[-0.85, 0, 0]}>
        <boxGeometry args={[0.08, 1.3, 1.82]} />
        <meshStandardMaterial
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[-0.85, 0, 0.91]}>
        <boxGeometry args={[0.09, 1.32, 0.06]} />
        <meshStandardMaterial
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[-0.85, 0, -0.91]}>
        <boxGeometry args={[0.09, 1.32, 0.06]} />
        <meshStandardMaterial
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>

      {/* Right band */}
      <mesh position={[0.85, 0, 0]}>
        <boxGeometry args={[0.08, 1.3, 1.82]} />
        <meshStandardMaterial
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0.85, 0, 0.91]}>
        <boxGeometry args={[0.09, 1.32, 0.06]} />
        <meshStandardMaterial
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0.85, 0, -0.91]}>
        <boxGeometry args={[0.09, 1.32, 0.06]} />
        <meshStandardMaterial
          map={metalColorMap}
          normalMap={metalNormalMap}
          roughnessMap={metalRoughnessMap}
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>

      {/* Side handles - left */}
      <group position={[-1.3, 0.2, 0]}>
        <mesh position={[0, 0.15, 0.5]}>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0.15, -0.5]}>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0, -0.5]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
      </group>

      {/* Side handles - right */}
      <group position={[1.3, 0.2, 0]}>
        <mesh position={[0, 0.15, 0.5]}>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0.15, -0.5]}>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0, -0.5]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
      </group>

      {/* 3D GNARS LOGO BUTTON */}
      <group position={[0, 0, 0.92]}>
        {/* Dark background panel */}

        {/* Metallic frame */}
        <mesh position={[0, 0, 0.003]}>
          <boxGeometry args={[1.25, 0.85, 0.04]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>

        {/* 3D Gnars Logo Model - Interactive Button */}
        <group
          position={[0, 0, 0.03]}
          scale={0.15}
          rotation={[0, 0, 0]}
          onPointerDown={handleButtonPointerDown}
          onPointerMove={handleButtonPointerMove}
          onClick={handleButtonClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            handleButtonPointerOver();
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            handleButtonPointerOut();
          }}
        >
          <primitive object={clonedLogoScene} />
        </group>

        {/* Button spotlight removed */}

        {/* Glow halo removed */}
      </group>

      {/* Corner details - screws/bolts - using memoized positions */}
      {SCREW_POSITIONS.map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 16]} />
          <meshStandardMaterial
            map={metalColorMap}
            normalMap={metalNormalMap}
            roughnessMap={metalRoughnessMap}
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* Hover lights removed */}
    </group>
  );
});

FuturisticCrate.displayName = "FuturisticCrate";

interface AnimatedChest3DProps {
  onOpen: () => void;
  isOpening?: boolean;
  isPending?: boolean;
  disabled?: boolean;
  tier?: "bronze" | "silver" | "gold" | "black";
}

export default function AnimatedChest3D({
  onOpen,
  isOpening = false,
  isPending = false,
  disabled = false,
  tier = "bronze",
}: AnimatedChest3DProps) {
  const hasTriggeredRef = useRef(false);

  const handleChestClick = useCallback(() => {
    // Prevent multiple triggers
    if (disabled || hasTriggeredRef.current) return;

    hasTriggeredRef.current = true;
    onOpen();
  }, [disabled, onOpen]);

  // Reset trigger flag when transaction completes or fails
  useEffect(() => {
    if (!isOpening && !isPending) {
      // If we had a pending transaction that completed or failed, reset the trigger
      if (hasTriggeredRef.current) {
        // Wait for the lid to close before allowing another click
        const timer = setTimeout(() => {
          hasTriggeredRef.current = false;
        }, 1500); // Wait for closing animation
        return () => clearTimeout(timer);
      }
    }
  }, [isOpening, isPending]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <Canvas
        shadows
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <PerspectiveCamera makeDefault position={[0, 1.5, 6]} fov={45} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={8}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 5, -3]} intensity={0.6} color="#88aaff" />
        <spotLight
          position={[0, 3, 4]}
          angle={0.5}
          penumbra={1}
          intensity={1.2}
          color="#ffffff"
          castShadow
        />
        <spotLight position={[-4, 2, 2]} angle={0.4} penumbra={1} intensity={0.4} color="#6699ff" />

        {/* Environment for reflections */}
        <Environment preset="warehouse" background={false} />

        {/* The Futuristic Crate */}
        <FuturisticCrate onClick={handleChestClick} isOpening={isOpening} isPending={isPending} tier={tier} />
      </Canvas>

      {/* Transaction status indicator */}
      {isPending && (
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <div className="inline-block border border-orange-400 rounded-lg px-6 py-3">
            <p className="text-sm text-white font-mono font-bold animate-pulse">
              Waiting for approval...
            </p>
          </div>
        </div>
      )}
      {isOpening && !isPending && (
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <div className="inline-block bg-green-500/90 backdrop-blur-sm border border-green-400 rounded-lg px-6 py-3">
            <p className="text-sm text-white font-mono font-bold animate-pulse">
              Transaction confirmed! Opening...
            </p>
          </div>
        </div>
      )}

      {/* Sci-fi corner decorations */}
      <div className="absolute top-4 left-4 text-orange-500/40 font-mono text-xs">
        [ GNARS LOOTBOX V4 ]
      </div>
      <div className="absolute top-4 right-4 text-cyan-500/40 font-mono text-xs">[ READY ]</div>
    </div>
  );
}
