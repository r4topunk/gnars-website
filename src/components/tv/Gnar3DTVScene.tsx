"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TV3DModel } from "./TV3DModel";
import { useTVTextureControls, TV_PRESETS } from "./TVTextureControls";

interface Gnar3DTVSceneProps {
  videoUrl?: string;
  autoRotate?: boolean;
  onNextVideo?: () => void;
}

export function Gnar3DTVScene({
  videoUrl,
  autoRotate = true,
  onNextVideo,
}: Gnar3DTVSceneProps) {
  const { config } = useTVTextureControls();

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
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
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
            textureConfig={config}
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
    </div>
  );
}

// Export presets for external use
export { TV_PRESETS };
