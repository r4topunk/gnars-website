"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TV3DModel } from "./TV3DModel";

interface Gnar3DTVSceneProps {
  videoUrl?: string;
  autoRotate?: boolean;
  onNextVideo?: () => void;
  playDuration?: number;
}

export function Gnar3DTVScene({
  videoUrl,
  autoRotate = true,
  onNextVideo,
  playDuration = 3,
}: Gnar3DTVSceneProps) {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0.3, 3.5], fov: 50 }}
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
            playDuration={playDuration}
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
