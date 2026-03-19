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
  const gnarsLogoModel = useGLTF("/models/NogRail.glb");
  
  // Clone the model scene
  const clonedLogoScene = useMemo(() => {
    return gnarsLogoModel.scene.clone();
  }, [gnarsLogoModel.scene]);

  // Center model and apply noggles colors (red frame, black/white lenses)
  useEffect(() => {
    if (clonedLogoScene) {
      const box = new THREE.Box3().setFromObject(clonedLogoScene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      clonedLogoScene.position.sub(center);

      // Apply silver/chrome material
      clonedLogoScene.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#D8D8D8'),
          metalness: 0.6,
          roughness: 0.25,
          emissive: new THREE.Color('#888888'),
          emissiveIntensity: 0.2,
        });
      });
    }
  }, [clonedLogoScene]);

  // Auto-centered via bounding box above
  return (
    <group ref={logoRef} scale={1} position={[0, 0, 0]} rotation={[-0.15, -0.3, 0]}>
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
              <PerspectiveCamera makeDefault position={[50, 30, 160]} fov={50} />
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                enableRotate={true}
                enableDamping
                dampingFactor={0.05}
              />
              <ambientLight intensity={0.8} />
              <directionalLight position={[5, 5, 5]} intensity={2.0} castShadow />
              <directionalLight position={[-3, 3, -3]} intensity={1.2} color="#ffffff" />
              <spotLight position={[0, 5, 0]} intensity={1.5} angle={0.6} penumbra={1} />
              <Environment preset="city" background={false} />
              <NogglesRailModel3D />
            </Canvas>
          </div>
        </div>
      </div>
    </section>
  );
}
