"use client";

// Helper to convert hex to RGB array
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [0, 0, 0];
}

// Presets configuration
const PRESETS = {
  "Dark Walnut": {
    wood: {
      pixelSize: 0.035,
      grainIntensity: 1.0,
      grainScale: 2.5,
      quantizeLevels: 4,
      lightingIntensity: 0.35,
      colorDark: "#2E190D",
      colorMid: "#472E1A",
      colorLight: "#614026",
      colorHighlight: "#7A5233",
    },
    controlPanel: {
      baseColor: "#5c3b21",
      pixelSize: 0.07,
      noise: 0.06,
      yellowing: 0.70,
    },
  },
  "Pixel Art": {
    wood: {
      pixelSize: 0.06,
      grainIntensity: 1.0,
      grainScale: 4.0,
      quantizeLevels: 4,
      lightingIntensity: 0.5,
      colorDark: "#523419",
      colorMid: "#734D29",
      colorLight: "#946638",
      colorHighlight: "#AD8047",
    },
    controlPanel: {
      baseColor: "#5c3b21",
      pixelSize: 0.08,
      noise: 0.08,
      yellowing: 0.6,
    },
  },
  "Realistic": {
    wood: {
      pixelSize: 0.01,
      grainIntensity: 0.8,
      grainScale: 6.0,
      quantizeLevels: 16,
      lightingIntensity: 0.6,
      colorDark: "#59381F",
      colorMid: "#7A522E",
      colorLight: "#8C6138",
      colorHighlight: "#9E7342",
    },
    controlPanel: {
      baseColor: "#6b4528",
      pixelSize: 0.01,
      noise: 0.03,
      yellowing: 0.5,
    },
  },
  "Retro 8-bit": {
    wood: {
      pixelSize: 0.12,
      grainIntensity: 1.2,
      grainScale: 2.0,
      quantizeLevels: 3,
      lightingIntensity: 0.4,
      colorDark: "#402614",
      colorMid: "#805933",
      colorLight: "#B3804D",
      colorHighlight: "#D9A666",
    },
    controlPanel: {
      baseColor: "#4a2e18",
      pixelSize: 0.10,
      noise: 0.12,
      yellowing: 0.8,
    },
  },
  "Oak Classic": {
    wood: {
      pixelSize: 0.04,
      grainIntensity: 0.6,
      grainScale: 5.0,
      quantizeLevels: 8,
      lightingIntensity: 0.55,
      colorDark: "#73522E",
      colorMid: "#8C6B40",
      colorLight: "#A68052",
      colorHighlight: "#B89461",
    },
    controlPanel: {
      baseColor: "#5c3b21",
      pixelSize: 0.05,
      noise: 0.04,
      yellowing: 0.5,
    },
  },
};

export interface PlasticConfig {
  baseColor: [number, number, number];
  pixelSize: number;
  noiseIntensity: number;
  yellowing: number;
}

export interface TVTextureConfig {
  wood: {
    pixelSize: number;
    grainIntensity: number;
    grainScale: number;
    quantizeLevels: number;
    lightingIntensity: number;
    colorDark: [number, number, number];
    colorMid: [number, number, number];
    colorLight: [number, number, number];
    colorHighlight: [number, number, number];
  };
  controlPanel: PlasticConfig;
}

// Hook that provides texture settings
export function useTVTextureControls(presetName: keyof typeof PRESETS = "Dark Walnut") {
  const preset = PRESETS[presetName];

  const config: TVTextureConfig = {
    wood: {
      pixelSize: preset.wood.pixelSize,
      grainIntensity: preset.wood.grainIntensity,
      grainScale: preset.wood.grainScale,
      quantizeLevels: preset.wood.quantizeLevels,
      lightingIntensity: preset.wood.lightingIntensity,
      colorDark: hexToRgb(preset.wood.colorDark),
      colorMid: hexToRgb(preset.wood.colorMid),
      colorLight: hexToRgb(preset.wood.colorLight),
      colorHighlight: hexToRgb(preset.wood.colorHighlight),
    },
    controlPanel: {
      baseColor: hexToRgb(preset.controlPanel.baseColor),
      pixelSize: preset.controlPanel.pixelSize,
      noiseIntensity: preset.controlPanel.noise,
      yellowing: preset.controlPanel.yellowing,
    },
  };

  return { config };
}

// Export presets for external use
export { PRESETS as TV_PRESETS };
