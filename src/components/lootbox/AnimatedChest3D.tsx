"use client";

import { useRef, useState, useCallback, memo, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from "@react-three/drei";
import { Group, PointLight, TextureLoader } from "three";
import * as THREE from "three";

interface ChestProps {
  onClick: () => void;
  isOpening: boolean;
  isPending: boolean;
}

// Memoize static position arrays to prevent recreation
const SCREW_POSITIONS: [number, number, number][] = [
  [-1.1, 0.5, 0.8],
  [1.1, 0.5, 0.8],
  [-1.1, -0.5, 0.8],
  [1.1, -0.5, 0.8],
];

// Button state type
type ButtonState = 'idle' | 'hover' | 'pressed' | 'loading' | 'success' | 'disabled';

const FuturisticCrate = memo(({ onClick, isOpening, isPending }: ChestProps) => {
  const crateRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const hoverLightRef = useRef<PointLight>(null);
  const rimLight1Ref = useRef<PointLight>(null);
  const rimLight2Ref = useRef<PointLight>(null);
  const interiorLightRef = useRef<PointLight>(null);
  const floatingLogoRef = useRef<Group>(null);

  // Load Gnars logo texture for floating interior logo
  const gnarsLogo = useLoader(TextureLoader, '/gnars.webp');

  // Load red noggles texture for lid decal
  const redNoggles = useLoader(TextureLoader, '/red_noggles.png');

  // Load Gnars logo 3D model for button
  const gnarsLogoModel = useGLTF('/models/gnars-logo.glb');

  // Configure textures for proper decal rendering
  useEffect(() => {
    if (gnarsLogo) {
      gnarsLogo.colorSpace = THREE.SRGBColorSpace;
      gnarsLogo.needsUpdate = true;
    }
    if (redNoggles) {
      redNoggles.colorSpace = THREE.SRGBColorSpace;
      redNoggles.needsUpdate = true;
    }
  }, [gnarsLogo, redNoggles]);

  // Hover state - real state instead of ref+forceUpdate for proper reactivity
  const [hovered, setHovered] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);

  // Animation refs - use refs instead of state to avoid per-frame re-renders
  const openProgressRef = useRef(0);
  const pulseRef = useRef(0.5);
  const loadingRotationRef = useRef(0);

  // State only for conditional rendering threshold (not updated per-frame)
  const [showLogo, setShowLogo] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>('idle');

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
      if (distance > 3) { // Small threshold for button
        buttonIsDragging.current = true;
      }
    }
  }, []);

  const handleButtonClick = useCallback((e: PointerEvent) => {
    e.stopPropagation();
    if (!buttonIsDragging.current) {
      onClick();
    }
    buttonPointerDownPos.current = null;
    buttonIsDragging.current = false;
  }, [onClick]);

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
      setButtonState('loading');
    } else if (isOpening) {
      setButtonState('success');
    } else if (buttonHovered) {
      setButtonState('hover');
    } else {
      setButtonState('idle');
    }
  }, [isPending, isOpening, buttonHovered]); // Now includes buttonHovered for proper reactivity

  // Cursor management - centralized in useEffect instead of scattered in handlers
  useEffect(() => {
    const cursor = buttonHovered ? 'pointer' : 'auto';
    document.body.style.cursor = cursor;
    return () => {
      document.body.style.cursor = 'auto'; // Cleanup on unmount
    };
  }, [buttonHovered]);

  // Idle animation - shaking effect when not hovered
  useFrame((state) => {
    if (!crateRef.current) return;

    const time = state.clock.getElapsedTime();

    if (!hovered) {
      // Shake animation - like something inside wants to come out
      const shakeFastFreq = 8.0; // Fast vibration
      const shakeSlowFreq = 2.0; // Slower "rattle"

      // Combine fast and slow shakes for more organic feel
      const shakeX = Math.sin(time * shakeFastFreq) * 0.015 + Math.sin(time * shakeSlowFreq * 0.7) * 0.008;
      const shakeY = Math.cos(time * shakeFastFreq * 1.3) * 0.02 + Math.sin(time * shakeSlowFreq) * 0.01;
      const shakeZ = Math.sin(time * shakeFastFreq * 0.9) * 0.012;

      crateRef.current.position.x = shakeX;
      crateRef.current.position.y = shakeY;
      crateRef.current.position.z = shakeZ;

      // Slight rotation shake
      crateRef.current.rotation.x = Math.sin(time * shakeFastFreq * 1.1) * 0.02;
      crateRef.current.rotation.z = Math.cos(time * shakeFastFreq * 0.8) * 0.015;
    } else {
      // Static when hovered - smoothly return to center
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

    // Animate hover lights - use state instead of ref
    if (hoverLightRef.current) {
      hoverLightRef.current.intensity = hovered ? 3 : 0;
    }
    if (rimLight1Ref.current) {
      rimLight1Ref.current.intensity = hovered ? 1 : 0;
    }
    if (rimLight2Ref.current) {
      rimLight2Ref.current.intensity = hovered ? 0.8 : 0;
    }

    // Animate interior light with GAMMA CURVE for dramatic reveal - use ref instead of state
    if (interiorLightRef.current) {
      // Use gamma-like curve for dramatic ramp: slow start, fast middle, slow end
      const lightCurve = Math.pow(openProgressRef.current, 2.2);
      const targetIntensity = lightCurve * 8.0; // 0 → 8 smoothly

      // Smooth transition
      const currentIntensity = interiorLightRef.current.intensity;
      if (Math.abs(currentIntensity - targetIntensity) > 0.05) {
        interiorLightRef.current.intensity += (targetIntensity - currentIntensity) * 0.15;
      }
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
    }

    // Button pulse animation for loading state - use refs instead of setState to avoid per-frame re-renders
    if (buttonState === 'loading') {
      const time = state.clock.getElapsedTime();
      const pulseSpeed = 2.0; // Hz for loading pulse
      pulseRef.current = 0.5 + Math.sin(time * pulseSpeed * Math.PI) * 0.5;
      loadingRotationRef.current = time * 2; // Rotate loading indicator
    }
  });

  // Scale based on hover state
  const scale = hovered ? 1.05 : 1;

  // Button helper functions based on state
  const getButtonZ = () => {
    switch (buttonState) {
      case 'hover': return 0.09;
      case 'pressed': return 0.06;
      case 'loading': return 0.085;
      case 'success': return 0.09;
      case 'disabled': return 0.08;
      default: return 0.08; // idle
    }
  };

  const getButtonColor = () => {
    switch (buttonState) {
      case 'hover': return '#ffcc00';
      case 'pressed': return '#ff6600';
      case 'loading': return '#ff8800';
      case 'success': return '#00ff88';
      case 'disabled': return '#555555';
      default: return '#ff8800'; // idle
    }
  };

  const getButtonEmissive = () => {
    switch (buttonState) {
      case 'hover': return '#ffaa00';
      case 'pressed': return '#ff4400';
      case 'loading': return '#ff6600';
      case 'success': return '#00cc66';
      case 'disabled': return '#333333';
      default: return '#ff6600'; // idle
    }
  };

  const getButtonEmissiveIntensity = () => {
    switch (buttonState) {
      case 'hover': return 3.5;
      case 'pressed': return 1.5;
      case 'loading': return 2.0 + pulseRef.current * 0.8; // Pulsing - use ref instead of state
      case 'success': return 3.0;
      case 'disabled': return 0.5;
      default: return 2.0; // idle
    }
  };



  return (
    <group
      ref={crateRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      scale={scale}
    >
      {/* Main metallic base body - 5 faces (NO TOP - lid is the top) */}

      {/* Bottom face */}
      <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[2.5, 1.8]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.95}
          roughness={0.25}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Front face (facing camera) */}
      <mesh position={[0, 0, 0.9]} castShadow receiveShadow>
        <planeGeometry args={[2.5, 1.2]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.95}
          roughness={0.25}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Back face */}
      <mesh position={[0, 0, -0.9]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <planeGeometry args={[2.5, 1.2]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.95}
          roughness={0.25}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Left face */}
      <mesh position={[-1.25, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[1.8, 1.2]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.95}
          roughness={0.25}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Right face */}
      <mesh position={[1.25, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[1.8, 1.2]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.95}
          roughness={0.25}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* NO TOP FACE - lid serves as the top */}

      {/* Subtle weathering overlay on body */}
      <mesh position={[0.5, 0.2, 0.91]}>
        <boxGeometry args={[0.8, 0.5, 0.01]} />
        <meshStandardMaterial
          color="#3a3a3a"
          metalness={0.7}
          roughness={0.5}
          transparent
          opacity={0.3}
        />
      </mesh>
      <mesh position={[-0.6, -0.3, 0.91]}>
        <boxGeometry args={[0.6, 0.4, 0.01]} />
        <meshStandardMaterial
          color="#353535"
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
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.35} envMapIntensity={1.5} />
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

      {/* Orange accent lights on front panels */}
      <mesh position={[-0.8, 0.5, 0.93]}>
        <boxGeometry args={[0.15, 0.03, 0.01]} />
        <meshStandardMaterial
          color="#ff8800"
          emissive="#ff6600"
          emissiveIntensity={1.5}
          metalness={0.2}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0.8, 0.5, 0.93]}>
        <boxGeometry args={[0.15, 0.03, 0.01]} />
        <meshStandardMaterial
          color="#ff8800"
          emissive="#ff6600"
          emissiveIntensity={1.5}
          metalness={0.2}
          roughness={0.2}
        />
      </mesh>

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
        <meshStandardMaterial color="#2a2a2a" metalness={0.85} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, -0.92]}>
        <boxGeometry args={[1.8, 0.7, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.6} />
      </mesh>

      {/* INTERIOR OF THE BOX */}
      {/* Interior cavity - visible when lid opens */}
      <group position={[0, 0, 0]}>
        {/* Bottom interior surface - LOWERED to create visible depth, not flat lid illusion */}
        <mesh position={[0, -0.70, 0]} receiveShadow>
          <boxGeometry args={[2.3, 0.1, 1.6]} />
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.1}
            roughness={0.9}
          />
        </mesh>

        {/* Interior side walls - left - DOUBLE SIDED for visibility */}
        <mesh position={[-1.15, 0, 0]} receiveShadow>
          <boxGeometry args={[0.1, 1.0, 1.6]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.3}
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Interior side walls - right - DOUBLE SIDED for visibility */}
        <mesh position={[1.15, 0, 0]} receiveShadow>
          <boxGeometry args={[0.1, 1.0, 1.6]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.3}
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Interior back wall - DOUBLE SIDED for visibility */}
        <mesh position={[0, 0, -0.75]} receiveShadow>
          <boxGeometry args={[2.3, 1.0, 0.1]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.3}
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Interior front wall - REDUCED height + LOWERED to read as lip, not lid */}
        <mesh position={[0, -0.45, 0.75]} receiveShadow>
          <boxGeometry args={[2.3, 0.25, 0.1]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.3}
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Subtle vertical rib on back wall - creates depth shadow cue */}
        <mesh position={[0, -0.2, -0.76]} receiveShadow castShadow>
          <boxGeometry args={[0.08, 0.6, 0.02]} />
          <meshStandardMaterial
            color="#050505"
            metalness={0.2}
            roughness={0.95}
          />
        </mesh>

        {/* Foam padding inserts - LOWERED to match new bottom depth */}
        <mesh position={[0, -0.65, 0]}>
          <boxGeometry args={[2.2, 0.05, 1.5]} />
          <meshStandardMaterial
            color="#2a2200"
            metalness={0.0}
            roughness={1.0}
          />
        </mesh>

        {/* Interior golden light source - ANGLED to create depth shadows, not flat illumination */}
        <pointLight
          ref={interiorLightRef}
          position={[0, -0.15, 0.4]}
          color="#ffaa00"
          intensity={0}
          distance={3}
          decay={1.5}
        />

        {/* Additional upward glow for dramatic effect */}
        <pointLight
          position={[0, -0.3, 0]}
          color="#ff8800"
          intensity={isOpening ? 4 : isPending ? 1.5 : 0}
          distance={2.5}
          decay={2}
        />

        {/* FLOATING 3D GNARS LOGO - Legendary Item Effect */}
        {/* Conditional rendering based on showLogo state (updated only when threshold crossed) */}
        {showLogo && (
          <group ref={floatingLogoRef} position={[0, 0.1, 0.3]}>
            {/* Subtle golden cube as background glow - reduced intensity */}
            <mesh>
              <boxGeometry args={[0.6, 0.6, 0.6]} />
              <meshStandardMaterial
                color="#ffcc00"
                emissive="#ffaa00"
                emissiveIntensity={0.8 * openProgressRef.current}
                metalness={0.7}
                roughness={0.2}
              />
            </mesh>

            {/* Main logo texture - front (clean decal with alpha) */}
            <mesh position={[0, 0, 0.31]}>
              <planeGeometry args={[0.8, 0.8]} />
              <meshBasicMaterial
                map={gnarsLogo}
                transparent
                alphaTest={0.2}
                toneMapped={false}
              />
            </mesh>

            {/* Logo texture - back (clean decal with alpha) */}
            <mesh position={[0, 0, -0.31]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.8, 0.8]} />
              <meshBasicMaterial
                map={gnarsLogo}
                transparent
                alphaTest={0.2}
                toneMapped={false}
              />
            </mesh>

            {/* Large golden glow ring */}
            <mesh position={[0, 0, 0]} scale={1.6}>
              <ringGeometry args={[0.4, 0.55, 32]} />
              <meshBasicMaterial
                color="#ffcc00"
                transparent
                opacity={0.45 * openProgressRef.current}
              />
            </mesh>

            {/* Atmospheric glow sphere */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshBasicMaterial
                color="#ffdd00"
                transparent
                opacity={0.18 * openProgressRef.current}
              />
            </mesh>

            {/* Strong point light from logo */}
            <pointLight
              position={[0, 0, 0.4]}
              color="#ffcc00"
              intensity={4.0 * openProgressRef.current}
              distance={2.0}
              decay={1.5}
            />
          </group>
        )}
      </group>

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
            color="#2a2a2a"
            metalness={0.95}
            roughness={0.25}
            envMapIntensity={2.0}
          />
        </mesh>

        {/* Metallic reinforcement edges on lid - thicker and more prominent */}
        <mesh position={[1.28, 0, 0]}>
          <boxGeometry args={[0.08, 0.32, 1.95]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.25} />
        </mesh>
        <mesh position={[-1.28, 0, 0]}>
          <boxGeometry args={[0.08, 0.32, 1.95]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.25} />
        </mesh>
        {/* Front and back metal bands on lid */}
        <mesh position={[0, 0, 0.94]}>
          <boxGeometry args={[2.5, 0.32, 0.08]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, -0.94]}>
          <boxGeometry args={[2.5, 0.32, 0.08]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.25} />
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
            <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}

        {/* Red Noggles on lid - clean decal with alpha - wider aspect ratio for glasses */}
        <mesh position={[0, 0.063, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
          <planeGeometry args={[1.4, 0.7]} />
          <meshBasicMaterial
            map={redNoggles}
            transparent={true}
            opacity={1.0}
            alphaTest={0.1}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Hinge details at the back of lid */}
        {[-0.7, 0, 0.7].map((xPos, i) => (
          <group key={`hinge-${i}`} position={[xPos, -0.15, -0.94]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.2, 12]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Hinge brackets */}
            <mesh position={[0, 0, 0.08]}>
              <boxGeometry args={[0.08, 0.12, 0.04]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.88} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, -0.08]}>
              <boxGeometry args={[0.08, 0.12, 0.04]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.88} roughness={0.25} />
            </mesh>
          </group>
        ))}

        {/* Lid latch receiver at front */}
        <mesh position={[0, -0.15, 0.94]}>
          <boxGeometry args={[0.3, 0.08, 0.05]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.9} roughness={0.2} />
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
            <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Corner detail */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.06, 0.17, 0.06]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Vertical metal bands wrapping around the crate */}
      {/* Left band */}
      <mesh position={[-0.85, 0, 0]}>
        <boxGeometry args={[0.08, 1.3, 1.82]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.25} />
      </mesh>
      <mesh position={[-0.85, 0, 0.91]}>
        <boxGeometry args={[0.09, 1.32, 0.06]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.85, 0, -0.91]}>
        <boxGeometry args={[0.09, 1.32, 0.06]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Right band */}
      <mesh position={[0.85, 0, 0]}>
        <boxGeometry args={[0.08, 1.3, 1.82]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.25} />
      </mesh>
      <mesh position={[0.85, 0, 0.91]}>
        <boxGeometry args={[0.09, 1.32, 0.06]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.85, 0, -0.91]}>
        <boxGeometry args={[0.09, 1.32, 0.06]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Side handles - left */}
      <group position={[-1.3, 0.2, 0]}>
        <mesh position={[0, 0.15, 0.5]}>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial color="#555555" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.15, -0.5]}>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, -0.5]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial color="#555555" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* Side handles - right */}
      <group position={[1.3, 0.2, 0]}>
        <mesh position={[0, 0.15, 0.5]}>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial color="#555555" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.15, -0.5]}>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, -0.5]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial color="#555555" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* 3D GNARS LOGO BUTTON */}
      <group position={[0, 0, 0.92]}>
        {/* Dark background panel */}
        <mesh position={[0, 0, -0.025]}>
          <boxGeometry args={[1.2, 0.8, 0.08]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>

        {/* Metallic frame */}
        <mesh position={[0, 0, 0.003]}>
          <boxGeometry args={[1.25, 0.85, 0.04]} />
          <meshStandardMaterial
            color="#3a3a3a"
            metalness={0.95}
            roughness={0.15}
          />
        </mesh>

        {/* 3D Gnars Logo Model - Interactive Button */}
        <group
          position={[0, 0, 0.15]}
          scale={buttonState === 'hover' ? 0.17 : buttonState === 'loading' ? 0.15 + pulseRef.current * 0.015 : 0.15}
          rotation={[0, buttonState === 'loading' ? loadingRotationRef.current : 0, 0]}
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
          <primitive object={gnarsLogoModel.scene} />
        </group>

        {/* Button spotlight */}
        <pointLight
          position={[0, 0, 0.3]}
          color="#ffcc00"
          intensity={buttonState === 'hover' ? 1.2 : buttonState === 'loading' ? 0.8 + pulseRef.current * 0.3 : 0.6}
          distance={1.5}
          decay={2}
        />

        {/* Glow halo effect on hover/loading */}
        {(buttonState === 'hover' || buttonState === 'loading' || buttonState === 'success') && (
          <mesh position={[0, 0, 0.05]} rotation={[0, 0, 0]} renderOrder={5}>
            <ringGeometry args={[0.25, 0.35, 32]} />
            <meshBasicMaterial
              color={buttonState === 'success' ? '#00ff88' : '#ffcc00'}
              transparent
              opacity={buttonState === 'loading' ? pulseRef.current * 0.4 : 0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

      {/* Corner details - screws/bolts - using memoized positions */}
      {SCREW_POSITIONS.map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 16]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Lights with refs to avoid conditional mounting/unmounting */}
      <pointLight
        ref={hoverLightRef}
        position={[0, 0, 1.2]}
        color="#ff6600"
        intensity={0}
        distance={4}
      />
      <pointLight
        ref={rimLight1Ref}
        position={[2, 1, 0]}
        color="#4488ff"
        intensity={0}
        distance={5}
      />
      <pointLight
        ref={rimLight2Ref}
        position={[-2, 1, 0]}
        color="#44ffff"
        intensity={0}
        distance={5}
      />

    </group>
  );
});

FuturisticCrate.displayName = "FuturisticCrate";

interface AnimatedChest3DProps {
  onOpen: () => void;
  isOpening?: boolean;
  isPending?: boolean;
  disabled?: boolean;
}

export default function AnimatedChest3D({
  onOpen,
  isOpening = false,
  isPending = false,
  disabled = false,
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
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
      <Canvas
        shadows
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={[0, 2, 5]} />
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
        <directionalLight
          position={[-3, 5, -3]}
          intensity={0.6}
          color="#88aaff"
        />
        <spotLight
          position={[0, 3, 4]}
          angle={0.5}
          penumbra={1}
          intensity={1.2}
          color="#ffffff"
          castShadow
        />
        <spotLight
          position={[-4, 2, 2]}
          angle={0.4}
          penumbra={1}
          intensity={0.4}
          color="#6699ff"
        />

        {/* Environment for reflections */}
        <Environment preset="warehouse" background={false} />

        {/* The Futuristic Crate */}
        <FuturisticCrate onClick={handleChestClick} isOpening={isOpening} isPending={isPending} />
      </Canvas>

      {/* Transaction status indicator */}
      {isPending && (
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <div className="inline-block bg-orange-500/90 backdrop-blur-sm border border-orange-400 rounded-lg px-6 py-3">
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

      {/* HUD-style instructions */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <div className="inline-block bg-black/60 backdrop-blur-sm border border-cyan-500/30 rounded-lg px-6 py-3">
          <p className="text-sm text-cyan-400 font-mono">
            [ CLICK ORANGE BUTTON ] Open lootbox • [ HOVER ] See effects
          </p>
          <p className="text-xs text-cyan-600/80 font-mono mt-1">
            DRAG: Rotate • SCROLL: Zoom
          </p>
        </div>
      </div>

      {/* Sci-fi corner decorations */}
      <div className="absolute top-4 left-4 text-orange-500/40 font-mono text-xs">
        [ GNARS LOOTBOX V4 ]
      </div>
      <div className="absolute top-4 right-4 text-cyan-500/40 font-mono text-xs">
        [ READY ]
      </div>
    </div>
  );
}
