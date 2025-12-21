"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TV3DModel } from "./TV3DModel";
import {
  WoodTextureControls,
  useWoodTextureSettings,
  WOOD_PRESETS,
} from "./WoodTextureControls";

interface Gnar3DTVSceneProps {
  videoUrl?: string;
  autoRotate?: boolean;
  onNextVideo?: () => void;
  showWoodControls?: boolean;
}

export function Gnar3DTVScene({
  videoUrl,
  autoRotate = true,
  onNextVideo,
  showWoodControls = false,
}: Gnar3DTVSceneProps) {
  const { settings, setSettings, controlsVisible, toggleControls } =
    useWoodTextureSettings("dark-walnut");

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [1, 1, 4], fov: 60 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: true,
        }}
        style={{ background: "transparent" }}
        dpr={1}
      >
        {/* Lighting - bright setup for retro TV */}
        <ambientLight intensity={4} />
        <directionalLight position={[5, 5, 5]} intensity={3} />
        <directionalLight position={[-5, 5, -5]} intensity={2} />
        <directionalLight position={[0, 3, 5]} intensity={2} />
        <pointLight position={[0, 2, 4]} intensity={2} />

        {/* TV Model */}
        <Suspense fallback={null}>
          <TV3DModel
            videoUrl={videoUrl}
            autoRotate={autoRotate}
            onNextVideo={onNextVideo}
            woodSettings={settings}
          />
        </Suspense>

        {/* Controls */}
        <OrbitControls
          enableDamping={false}
          minDistance={2}
          maxDistance={8}
          enablePan={false}
          enableZoom={false}
        />
      </Canvas>

      {/* Wood Texture Controls Panel */}
      {showWoodControls && (
        <WoodTextureControls
          settings={settings}
          onSettingsChange={setSettings}
          visible={controlsVisible}
          onToggleVisibility={toggleControls}
        />
      )}
    </div>
  );
}

// Export presets for external use
export { WOOD_PRESETS };
