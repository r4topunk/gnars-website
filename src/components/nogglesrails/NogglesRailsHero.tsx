"use client";

import { useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NOGGLES_RAILS } from "@/content/nogglesrails";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { TextureLoader } from "three";
import * as THREE from "three";

// 3D NogglesRail Model Component
function NogglesRailModel3D() {
  const logoRef = useRef<THREE.Group>(null);
  const gnarsLogoModel = useGLTF("/models/noggles-rail.glb");
  
  // Clone the model scene
  const clonedLogoScene = useMemo(() => {
    return gnarsLogoModel.scene.clone();
  }, [gnarsLogoModel.scene]);
  
  // Load metal plate textures
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

  // Configure textures
  useEffect(() => {
    if (metalColorMap) {
      metalColorMap.colorSpace = THREE.SRGBColorSpace;
      metalColorMap.wrapS = metalColorMap.wrapT = THREE.RepeatWrapping;
      metalColorMap.repeat.set(2, 2);
      metalColorMap.needsUpdate = true;
    }
    if (metalNormalMap) {
      metalNormalMap.colorSpace = THREE.LinearSRGBColorSpace;
      metalNormalMap.wrapS = metalNormalMap.wrapT = THREE.RepeatWrapping;
      metalNormalMap.repeat.set(2, 2);
      metalNormalMap.needsUpdate = true;
    }
    if (metalRoughnessMap) {
      metalRoughnessMap.colorSpace = THREE.LinearSRGBColorSpace;
      metalRoughnessMap.wrapS = metalRoughnessMap.wrapT = THREE.RepeatWrapping;
      metalRoughnessMap.repeat.set(2, 2);
      metalRoughnessMap.needsUpdate = true;
    }

    // Apply textures to model
    if (clonedLogoScene && metalColorMap && metalNormalMap && metalRoughnessMap) {
      clonedLogoScene.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const material = (mesh.material as THREE.MeshStandardMaterial).clone();
          mesh.material = material;
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

  // Spinning animation
  useFrame((state) => {
    if (!logoRef.current) return;
    const time = state.clock.getElapsedTime();
    logoRef.current.rotation.y = time * 0.5; // Slow spin
  });

  return (
    <group ref={logoRef} scale={1.5}>
      <primitive object={clonedLogoScene} />
    </group>
  );
}

export default function NogglesRailsHero() {
  const stats = useMemo(() => {
    const countries = new Set(NOGGLES_RAILS.map((r) => r.country));
    const continents = new Set(NOGGLES_RAILS.map((r) => r.continent));
    return [
      { value: NOGGLES_RAILS.length, label: "Installations" },
      { value: countries.size, label: "Countries" },
      { value: continents.size, label: "Continents" },
    ];
  }, []);

  return (
    <section className="py-8 md:py-10 lg:py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left — text */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              NogglesRails
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Community-funded skate rails installed in spots around the world.
              Open, CC0, owned by no one and everyone.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex flex-col">
                <span className="text-2xl font-bold">{value}</span>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                document.getElementById("map")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore Map
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                document.getElementById("rails")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              View All Rails
            </Button>
          </div>
        </div>

        {/* Right — 3D Model */}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-full h-[400px]">
            <Canvas
              shadows
              dpr={[1, 2]}
              performance={{ min: 0.5 }}
              gl={{ alpha: true, antialias: true }}
              style={{ background: "transparent" }}
            >
              <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={45} />
              <OrbitControls
                enableZoom={true}
                enablePan={false}
                minDistance={2}
                maxDistance={6}
                enableDamping
                dampingFactor={0.05}
              />
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
              <directionalLight position={[-3, 3, -3]} intensity={0.6} color="#88aaff" />
              <Environment preset="warehouse" background={false} />
              <NogglesRailModel3D />
            </Canvas>
          </div>
        </div>
      </div>
    </section>
  );
}
