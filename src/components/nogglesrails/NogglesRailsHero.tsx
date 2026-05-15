"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOGGLES_RAILS } from "@/content/nogglesrails";

const RAIL_COLOR_PRESETS = [
  { name: "OG Nogglesrail", value: "#FF2D2D" },
  { name: "Dark Gnars", value: "#0B0B0B" },
  { name: "Pink Lil Nouns", value: "#FF6383" },
  { name: "BASED", value: "#0066FF" },
  { name: "DEGEN", value: "#7B2DFF" },
  { name: "HIGHER", value: "#2BFF00" },
  { name: "Yellow Collective", value: "#FFD400" },
  { name: "Storm", value: "#5A5F66" },
  { name: "Gnarly Mud", value: "#5C3A21" },
  { name: "Cloud", value: "#F2F2F0" },
];

const DEFAULT_FRAME_COLOR = RAIL_COLOR_PRESETS[0].value;

// 3D NogglesRail Model Component
function NogglesRailModel3D({ frameColor }: { frameColor: string }) {
  const logoRef = useRef<THREE.Group>(null);
  const gnarsLogoModel = useGLTF("/models/NogRail-colors.glb");

  const clonedLogoScene = useMemo(() => {
    return gnarsLogoModel.scene.clone();
  }, [gnarsLogoModel.scene]);

  // Center model on first mount
  useEffect(() => {
    if (clonedLogoScene) {
      const box = new THREE.Box3().setFromObject(clonedLogoScene);
      const center = box.getCenter(new THREE.Vector3());
      clonedLogoScene.position.sub(center);

      // Apply fixed lens materials once
      clonedLogoScene.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;

        if (mesh.name === "NogRail_2") {
          // White lens
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#FFFFFF"),
            roughness: 0.3,
          });
        } else if (mesh.name === "NogRail_3") {
          // Black lens
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#1A1A1A"),
            roughness: 0.3,
          });
        }
      });
    }
  }, [clonedLogoScene]);

  // Update frame color reactively
  useEffect(() => {
    if (!clonedLogoScene) return;
    clonedLogoScene.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || mesh.name !== "NogRail_1") return;

      mesh.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(frameColor),
        metalness: 0.85,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 1.0,
        emissive: new THREE.Color(frameColor),
        emissiveIntensity: 0.05,
        envMapIntensity: 2.0,
      });
    });
  }, [clonedLogoScene, frameColor]);

  return (
    <group ref={logoRef} scale={1} position={[0, 0, 0]} rotation={[-0.15, -0.3, 0]}>
      <primitive object={clonedLogoScene} />
    </group>
  );
}

function NogglesCanvas({ frameColor }: { frameColor: string }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      performance={{ min: 0.5 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent", pointerEvents: "auto" }}
    >
      <PerspectiveCamera makeDefault position={[50, 30, 230]} fov={50} />
      <OrbitControls
        target={[0, 0, 0]}
        enableZoom={false}
        enablePan={false}
        enableRotate={true}
        enableDamping
        dampingFactor={0.05}
      />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={2.5} castShadow />
      <directionalLight position={[-5, 3, 2]} intensity={1.5} color="#ffffff" />
      <spotLight position={[0, 8, 3]} intensity={3.0} angle={0.4} penumbra={0.5} color="#ffffff" />
      <spotLight position={[3, 3, 5]} intensity={2.0} angle={0.6} penumbra={1} color="#f0f0ff" />
      <pointLight position={[-2, 2, 4]} intensity={1.5} color="#ffffff" />
      <Environment preset="studio" background={false} />
      <NogglesRailModel3D frameColor={frameColor} />
    </Canvas>
  );
}

export default function NogglesRailsHero() {
  const t = useTranslations("installations.nogglesrails");
  const [frameColor, setFrameColor] = useState(DEFAULT_FRAME_COLOR);

  const stats = useMemo(() => {
    const countries = new Set(NOGGLES_RAILS.map((r) => r.country));
    const continents = new Set(NOGGLES_RAILS.map((r) => r.continent));
    return [
      { value: NOGGLES_RAILS.length, label: t("stats.installations") },
      { value: countries.size, label: t("stats.countries") },
      { value: continents.size, label: t("stats.continents") },
    ];
  }, [t]);

  return (
    <section className="relative overflow-hidden py-8 md:py-10 lg:py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Mobile-only — 3D model in normal flow, above the text */}
        <div className="relative -mx-4 h-[300px] w-[calc(100%+2rem)] sm:h-[360px] lg:hidden">
          <NogglesCanvas frameColor={frameColor} />
        </div>

        {/* Left — text */}
        <div className="relative z-10 flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              NogglesRails
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">{t("heroDescription")}</p>
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
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => document.getElementById("map")?.scrollIntoView({ behavior: "smooth" })}
            >
              {t("actions.exploreMap")}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                document.getElementById("rails")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              {t("actions.viewAllRails")}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("actions.railColor")}</span>
              <Select value={frameColor} onValueChange={setFrameColor}>
                <SelectTrigger className="w-[210px]">
                  <SelectValue placeholder={t("actions.chooseColor")} />
                </SelectTrigger>
                <SelectContent>
                  {RAIL_COLOR_PRESETS.map(({ name, value }) => (
                    <SelectItem key={value} value={value}>
                      <span
                        className="size-3 rounded-full border border-border"
                        style={{ backgroundColor: value }}
                        aria-hidden="true"
                      />
                      <span>{name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Right — 3D Model: oversized canvas so the rail never clips when rotated */}
        <div
          className="pointer-events-none absolute hidden lg:block"
          style={{
            width: "140%",
            height: "140%",
            top: "50%",
            left: "50%",
            transform: "translate(-25%, -50%)",
          }}
        >
          <NogglesCanvas frameColor={frameColor} />
        </div>
      </div>
    </section>
  );
}
