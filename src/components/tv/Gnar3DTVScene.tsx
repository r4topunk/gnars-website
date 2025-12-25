"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TV3DModel } from "./TV3DModel";
import { useTVTextureControls, TV_PRESETS } from "./TVTextureControls";
import type { CreatorCoinImage } from "./useTVFeed";

interface Gnar3DTVSceneProps {
  videoUrl?: string;
  autoRotate?: boolean;
  onNextVideo?: () => void;
  creatorCoinImages?: CreatorCoinImage[];
}

export function Gnar3DTVScene({
  videoUrl,
  autoRotate = true,
  onNextVideo,
  creatorCoinImages = [],
}: Gnar3DTVSceneProps) {
  const { config } = useTVTextureControls();

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 60 }}
        frameloop="demand"
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        style={{ background: "transparent" }}
        dpr={1}
      >
        {/* Lighting - simplified for better performance */}
        <ambientLight intensity={3.5} />
        <directionalLight position={[5, 5, 5]} intensity={2.5} />
        <directionalLight position={[-3, 3, -3]} intensity={1.5} />

        {/* TV Model */}
        <Suspense fallback={null}>
          <TV3DModel
            videoUrl={videoUrl}
            autoRotate={autoRotate}
            onNextVideo={onNextVideo}
            textureConfig={config}
            creatorCoinImages={creatorCoinImages}
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
