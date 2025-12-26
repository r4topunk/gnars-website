"use client";

import { Suspense, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { WebGLRenderer } from "three";
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

  // Configure renderer for memory efficiency
  const handleCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    gl.setClearColor(0x000000, 0);
    // Disable auto-clearing to have more control
    gl.autoClear = true;
    gl.autoClearColor = true;
    gl.autoClearDepth = true;
    gl.autoClearStencil = true;
    // Reset render info each frame to prevent accumulation
    gl.info.autoReset = true;
  }, []);

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
          // Don't preserve drawing buffer - allows GPU to discard after compositing
          preserveDrawingBuffer: false,
          // Prefer low power GPU on multi-GPU systems
          precision: "lowp",
          // Limit pixel ratio for memory savings
          depth: true,
          stencil: false,
        }}
        onCreated={handleCreated}
        style={{ background: "transparent" }}
        dpr={0.6}
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
