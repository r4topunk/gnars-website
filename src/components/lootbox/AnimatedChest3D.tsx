"use client";

import { useRef, useState, useCallback, memo, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, Text } from "@react-three/drei";
import { Group, Mesh, PointLight, TextureLoader } from "three";

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

const FuturisticCrate = memo(({ onClick, isOpening, isPending }: ChestProps) => {
  const crateRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const hoverLightRef = useRef<PointLight>(null);
  const rimLight1Ref = useRef<PointLight>(null);
  const rimLight2Ref = useRef<PointLight>(null);
  const interiorLightRef = useRef<PointLight>(null);
  const floatingLogoRef = useRef<Group>(null);

  // Load Gnars logo texture
  const gnarsLogo = useLoader(TextureLoader, '/gnars.webp');

  // Use ref instead of state to avoid re-renders
  const hoveredRef = useRef(false);
  const buttonHoveredRef = useRef(false);
  const [, forceUpdate] = useState({});

  // Track pointer position to detect drag vs click
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  // Separate tracking for button clicks
  const buttonPointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const buttonIsDragging = useRef(false);

  const handlePointerDown = useCallback((e: any) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
  }, []);

  const handlePointerMove = useCallback((e: any) => {
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // If moved more than 5 pixels, consider it a drag
      if (distance > 5) {
        isDragging.current = true;
      }
    }

    // Track button drag separately
    if (buttonPointerDownPos.current) {
      const dx = e.clientX - buttonPointerDownPos.current.x;
      const dy = e.clientY - buttonPointerDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 3) { // Smaller threshold for button
        buttonIsDragging.current = true;
      }
    }
  }, []);

  const handleClick = useCallback(() => {
    // Only trigger onClick if user didn't drag
    if (!isDragging.current) {
      onClick();
    }
    pointerDownPos.current = null;
    isDragging.current = false;
  }, [onClick]);

  const handleButtonPointerDown = useCallback((e: any) => {
    e.stopPropagation();
    buttonPointerDownPos.current = { x: e.clientX, y: e.clientY };
    buttonIsDragging.current = false;
  }, []);

  const handleButtonClick = useCallback((e: any) => {
    e.stopPropagation();
    if (!buttonIsDragging.current) {
      onClick();
    }
    buttonPointerDownPos.current = null;
    buttonIsDragging.current = false;
  }, [onClick]);

  const handlePointerOver = useCallback(() => {
    if (!hoveredRef.current) {
      hoveredRef.current = true;
      forceUpdate({});
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    if (hoveredRef.current) {
      hoveredRef.current = false;
      forceUpdate({});
    }
  }, []);

  const handleButtonPointerOver = useCallback(() => {
    if (!buttonHoveredRef.current) {
      buttonHoveredRef.current = true;
      forceUpdate({});
    }
  }, []);

  const handleButtonPointerOut = useCallback(() => {
    if (buttonHoveredRef.current) {
      buttonHoveredRef.current = false;
      forceUpdate({});
    }
  }, []);

  // Idle animation - gentle floating
  useFrame((state) => {
    if (!crateRef.current) return;

    const time = state.clock.getElapsedTime();

    // Floating effect
    crateRef.current.position.y = Math.sin(time * 0.5) * 0.08;

    // Gentle rotation when hovered
    if (hoveredRef.current) {
      crateRef.current.rotation.y += 0.005;
    }

    // Opening/closing animation - lid rotates backward around hinges
    if (lidRef.current) {
      let targetRotation = 0; // Closed position
      let speed = 0.03; // Animation speed

      if (isPending) {
        // Stage 1: Semi-open (45 degrees) while waiting for approval
        targetRotation = -Math.PI / 4; // -45 degrees
        speed = 0.02; // Slower opening
      } else if (isOpening) {
        // Stage 2: Fully open (100 degrees) when transaction confirmed
        targetRotation = -Math.PI / 1.8; // -100 degrees
        speed = 0.03; // Medium speed for full open
      }
      // When both are false, it closes (targetRotation = 0)

      // Smooth rotation animation
      if (Math.abs(lidRef.current.rotation.x - targetRotation) > 0.001) {
        if (lidRef.current.rotation.x < targetRotation) {
          lidRef.current.rotation.x = Math.min(lidRef.current.rotation.x + speed, targetRotation);
        } else {
          lidRef.current.rotation.x = Math.max(lidRef.current.rotation.x - speed, targetRotation);
        }
      }
    }

    // Animate hover lights
    if (hoverLightRef.current) {
      hoverLightRef.current.intensity = hoveredRef.current ? 3 : 0;
    }
    if (rimLight1Ref.current) {
      rimLight1Ref.current.intensity = hoveredRef.current ? 1 : 0;
    }
    if (rimLight2Ref.current) {
      rimLight2Ref.current.intensity = hoveredRef.current ? 0.8 : 0;
    }

    // Animate interior light based on lid opening
    if (interiorLightRef.current) {
      let targetIntensity = 0;
      if (isPending) {
        targetIntensity = 3; // Dim glow when semi-open
      } else if (isOpening) {
        targetIntensity = 8; // Bright golden glow when fully open
      }
      // Smooth transition
      const currentIntensity = interiorLightRef.current.intensity;
      if (Math.abs(currentIntensity - targetIntensity) > 0.1) {
        interiorLightRef.current.intensity += (targetIntensity - currentIntensity) * 0.1;
      }
    }

    // Animate floating Gnars logo (magical item effect)
    if (floatingLogoRef.current && (isPending || isOpening)) {
      const time = state.clock.getElapsedTime();

      // Spinning rotation (Y-axis) - like a legendary item
      floatingLogoRef.current.rotation.y = time * 1.2; // Smooth constant spin

      // Floating up/down animation
      const floatAmplitude = 0.15; // How high it floats
      const floatSpeed = 1.5; // Speed of bobbing
      floatingLogoRef.current.position.y = Math.sin(time * floatSpeed) * floatAmplitude;

      // Slight tilt/wobble for more dynamic feel
      floatingLogoRef.current.rotation.x = Math.sin(time * 0.8) * 0.1;
      floatingLogoRef.current.rotation.z = Math.cos(time * 0.6) * 0.08;
    }
  });

  const hovered = hoveredRef.current;
  const buttonHovered = buttonHoveredRef.current;
  const scale = hovered ? 1.05 : 1;

  return (
    <group
      ref={crateRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
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

      {/* Worn edge strips - top - brighter accent */}
      <mesh position={[0, 0.61, 0.9]}>
        <boxGeometry args={[2.52, 0.03, 0.03]} />
        <meshStandardMaterial color="#666666" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.61, -0.9]}>
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
        {/* Bottom interior surface - dark with foam texture */}
        <mesh position={[0, -0.55, 0]} receiveShadow>
          <boxGeometry args={[2.3, 0.1, 1.6]} />
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.1}
            roughness={0.9}
          />
        </mesh>

        {/* Interior side walls - left */}
        <mesh position={[-1.15, 0, 0]} receiveShadow>
          <boxGeometry args={[0.1, 1.0, 1.6]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>

        {/* Interior side walls - right */}
        <mesh position={[1.15, 0, 0]} receiveShadow>
          <boxGeometry args={[0.1, 1.0, 1.6]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>

        {/* Interior back wall */}
        <mesh position={[0, 0, -0.75]} receiveShadow>
          <boxGeometry args={[2.3, 1.0, 0.1]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>

        {/* Interior front wall - lower part only (top is open) */}
        <mesh position={[0, -0.3, 0.75]} receiveShadow>
          <boxGeometry args={[2.3, 0.4, 0.1]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>

        {/* Foam padding inserts - yellow/orange accents */}
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[2.2, 0.05, 1.5]} />
          <meshStandardMaterial
            color="#2a2200"
            metalness={0.0}
            roughness={1.0}
          />
        </mesh>

        {/* Interior golden light source */}
        <pointLight
          ref={interiorLightRef}
          position={[0, 0, 0]}
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

        {/* Subtle volumetric glow effect - visible particles */}
        {(isPending || isOpening) && (
          <>
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial
                color="#ffcc00"
                transparent
                opacity={isOpening ? 0.15 : 0.08}
                emissive="#ff8800"
                emissiveIntensity={isOpening ? 2 : 1}
              />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial
                color="#ffaa00"
                transparent
                opacity={isOpening ? 0.08 : 0.04}
                emissive="#ff8800"
                emissiveIntensity={isOpening ? 1.5 : 0.8}
              />
            </mesh>
          </>
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

      {/* Horizontal reinforcement bands around base */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[2.52, 0.06, 1.83]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
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
        {/* Main lid body - dark metallic matching box */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.3, 1.9]} />
          <meshStandardMaterial
            color="#2a2a2a"
            metalness={0.95}
            roughness={0.25}
            envMapIntensity={2.0}
          />
        </mesh>

        {/* Raised center section on lid for more geometry */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[2.2, 0.08, 1.5]} />
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>

        {/* Recessed panels on top of lid - dark metallic */}
        <mesh position={[-0.6, 0.16, 0.4]}>
          <boxGeometry args={[0.5, 0.02, 0.4]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.5} />
        </mesh>
        <mesh position={[0.6, 0.16, 0.4]}>
          <boxGeometry args={[0.5, 0.02, 0.4]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.5} />
        </mesh>
        <mesh position={[-0.6, 0.16, -0.4]}>
          <boxGeometry args={[0.5, 0.02, 0.4]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.5} />
        </mesh>
        <mesh position={[0.6, 0.16, -0.4]}>
          <boxGeometry args={[0.5, 0.02, 0.4]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.5} />
        </mesh>

        {/* Weathered marks on lid - subtle darker areas */}
        <mesh position={[-0.5, 0.151, 0.3]} rotation={[-Math.PI / 2, 0, 0.3]}>
          <planeGeometry args={[0.4, 0.3]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.6} transparent opacity={0.4} />
        </mesh>
        <mesh position={[0.7, 0.151, -0.4]} rotation={[-Math.PI / 2, 0, -0.2]}>
          <planeGeometry args={[0.35, 0.25]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.6} transparent opacity={0.3} />
        </mesh>

        {/* Panel lines on lid - subtle accents */}
        <mesh position={[0, 0.152, 0.8]}>
          <boxGeometry args={[2.4, 0.01, 0.01]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.152, -0.8]}>
          <boxGeometry args={[2.4, 0.01, 0.01]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[1.1, 0.152, 0]}>
          <boxGeometry args={[0.01, 0.01, 1.6]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-1.1, 0.152, 0]}>
          <boxGeometry args={[0.01, 0.01, 1.6]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Lid top stripe detail with hazard marking */}
        <mesh position={[0, 0.16, 0.7]}>
          <boxGeometry args={[0.9, 0.06, 0.25]} />
          <meshStandardMaterial color="#ffcc00" metalness={0.15} roughness={0.7} />
        </mesh>
        <mesh position={[0.4, 0.16, 0.7]}>
          <boxGeometry args={[0.06, 0.06, 0.25]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.4, 0.16, 0.7]}>
          <boxGeometry args={[0.06, 0.06, 0.25]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
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

        {/* Gnars logo on lid - centered and prominent on TOP */}
        <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.0, 1.0]} />
          <meshStandardMaterial
            map={gnarsLogo}
            transparent
            opacity={0.95}
            metalness={0.1}
            roughness={0.4}
            emissive="#ffffff"
            emissiveIntensity={0.1}
          />
        </mesh>

        {/* Subtle glow behind logo */}
        <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.1, 1.1]} />
          <meshStandardMaterial
            color="#ff6600"
            transparent
            opacity={0.1}
            emissive="#ff6600"
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Gnars text on lid - at the front edge */}
        <Text
          position={[0, 0.22, 0.7]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.15}
          color="#ffaa00"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          GNARS DAO
        </Text>

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

      {/* Front lock/latch mechanism - PROMINENT CLICKABLE BUTTON */}
      <group position={[0, 0, 0.91]}>
        {/* Main lock housing - dark metallic frame - LARGER */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.0, 0.7, 0.10]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Recessed panel around button */}
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[0.92, 0.62, 0.06]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.3} />
        </mesh>

        {/* MAIN ORANGE BUTTON - LARGER and more prominent - INTERACTIVE */}
        <mesh
          position={[0, 0, buttonHovered ? 0.06 : 0.07]}
          castShadow
          onPointerDown={handleButtonPointerDown}
          onClick={handleButtonClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            handleButtonPointerOver();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            handleButtonPointerOut();
            document.body.style.cursor = 'auto';
          }}
        >
          <boxGeometry args={[0.75, 0.5, 0.05]} />
          <meshStandardMaterial
            color={buttonHovered ? "#ffcc00" : "#ff8800"}
            emissive={buttonHovered ? "#ffaa00" : "#ff6600"}
            emissiveIntensity={buttonHovered ? 3.0 : 2.0}
            metalness={0.3}
            roughness={0.1}
          />
        </mesh>

        {/* Button border/frame - metallic accent */}
        <mesh position={[0, 0, 0.09]}>
          <boxGeometry args={[0.78, 0.53, 0.02]} />
          <meshStandardMaterial
            color="#ffcc00"
            metalness={0.95}
            roughness={0.1}
            emissive="#ff8800"
            emissiveIntensity={buttonHovered ? 1.0 : 0.3}
          />
        </mesh>

        {/* Corner indicators on button - ADJUSTED for larger button */}
        {[
          [-0.34, 0.22, 0.10],
          [0.34, 0.22, 0.10],
          [-0.34, -0.22, 0.10],
          [0.34, -0.22, 0.10],
        ].map((pos, i) => (
          <mesh key={`button-corner-${i}`} position={pos as [number, number, number]}>
            <boxGeometry args={[0.06, 0.06, 0.01]} />
            <meshStandardMaterial
              color="#ffee00"
              metalness={0.9}
              roughness={0.1}
              emissive="#ffcc00"
              emissiveIntensity={buttonHovered ? 2.0 : 1.0}
            />
          </mesh>
        ))}

        {/* "OPEN" text on button - LARGER */}
        <Text
          position={[0, 0, buttonHovered ? 0.095 : 0.10]}
          fontSize={0.10}
          color={buttonHovered ? "#ffffff" : "#2a2a2a"}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          outlineWidth={0.005}
          outlineColor="#000000"
        >
          OPEN
        </Text>

        {/* Pulsing glow ring when hovered - LARGER */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.85, 0.60, 0.01]} />
          <meshStandardMaterial
            color="#ffaa00"
            transparent
            opacity={buttonHovered ? 0.6 : 0.2}
            emissive="#ff8800"
            emissiveIntensity={buttonHovered ? 3.0 : 1.0}
          />
        </mesh>

        {/* Side mounting bolts - ADJUSTED for larger housing */}
        <mesh position={[-0.48, 0.3, 0.02]}>
          <cylinderGeometry args={[0.04, 0.04, 0.05, 8]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.48, 0.3, 0.02]}>
          <cylinderGeometry args={[0.04, 0.04, 0.05, 8]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-0.48, -0.3, 0.02]}>
          <cylinderGeometry args={[0.04, 0.04, 0.05, 8]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.48, -0.3, 0.02]}>
          <cylinderGeometry args={[0.04, 0.04, 0.05, 8]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.2} />
        </mesh>
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
