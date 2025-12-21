"use client";

import { useState, useCallback } from "react";

export interface WoodTextureSettings {
  preset: string;
  pixelSize: number;
  grainIntensity: number;
  grainScale: number;
  colorDark: [number, number, number];
  colorMid: [number, number, number];
  colorLight: [number, number, number];
  colorHighlight: [number, number, number];
  lightingIntensity: number;
  quantizeLevels: number;
}

export const WOOD_PRESETS: Record<string, WoodTextureSettings> = {
  "pixel-art": {
    preset: "pixel-art",
    pixelSize: 0.06,
    grainIntensity: 1.0,
    grainScale: 4.0,
    colorDark: [0.32, 0.20, 0.10],
    colorMid: [0.45, 0.30, 0.16],
    colorLight: [0.58, 0.40, 0.22],
    colorHighlight: [0.68, 0.50, 0.28],
    lightingIntensity: 0.5,
    quantizeLevels: 4,
  },
  "realistic": {
    preset: "realistic",
    pixelSize: 0.01,
    grainIntensity: 0.8,
    grainScale: 6.0,
    colorDark: [0.35, 0.22, 0.12],
    colorMid: [0.48, 0.32, 0.18],
    colorLight: [0.55, 0.38, 0.22],
    colorHighlight: [0.62, 0.45, 0.26],
    lightingIntensity: 0.6,
    quantizeLevels: 16,
  },
  "retro-8bit": {
    preset: "retro-8bit",
    pixelSize: 0.12,
    grainIntensity: 1.2,
    grainScale: 2.0,
    colorDark: [0.25, 0.15, 0.08],
    colorMid: [0.50, 0.35, 0.20],
    colorLight: [0.70, 0.50, 0.30],
    colorHighlight: [0.85, 0.65, 0.40],
    lightingIntensity: 0.4,
    quantizeLevels: 3,
  },
  "oak-classic": {
    preset: "oak-classic",
    pixelSize: 0.04,
    grainIntensity: 0.6,
    grainScale: 5.0,
    colorDark: [0.45, 0.32, 0.18],
    colorMid: [0.55, 0.42, 0.25],
    colorLight: [0.65, 0.50, 0.32],
    colorHighlight: [0.72, 0.58, 0.38],
    lightingIntensity: 0.55,
    quantizeLevels: 8,
  },
  "dark-walnut": {
    preset: "dark-walnut",
    pixelSize: 0.035,
    grainIntensity: 1.0,
    grainScale: 2.5,
    colorDark: [0.18, 0.10, 0.05],
    colorMid: [0.28, 0.18, 0.10],
    colorLight: [0.38, 0.25, 0.15],
    colorHighlight: [0.48, 0.32, 0.20],
    lightingIntensity: 0.35,
    quantizeLevels: 4,
  },
};

interface WoodTextureControlsProps {
  settings: WoodTextureSettings;
  onSettingsChange: (settings: WoodTextureSettings) => void;
  visible?: boolean;
  onToggleVisibility?: () => void;
}

export function WoodTextureControls({
  settings,
  onSettingsChange,
  visible = true,
  onToggleVisibility,
}: WoodTextureControlsProps) {
  const handlePresetChange = useCallback((presetName: string) => {
    const preset = WOOD_PRESETS[presetName];
    if (preset) {
      onSettingsChange(preset);
    }
  }, [onSettingsChange]);

  const handleSliderChange = useCallback((key: keyof WoodTextureSettings, value: number) => {
    onSettingsChange({ ...settings, [key]: value, preset: "custom" });
  }, [settings, onSettingsChange]);

  const rgbToHex = (rgb: [number, number, number]) => {
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
      : [0, 0, 0];
  };

  const handleColorChange = useCallback((key: keyof WoodTextureSettings, hex: string) => {
    const rgb = hexToRgb(hex);
    onSettingsChange({ ...settings, [key]: rgb, preset: "custom" });
  }, [settings, onSettingsChange]);

  if (!visible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="absolute top-4 right-4 z-50 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono hover:bg-black/90 transition-colors"
      >
        [Wood Controls]
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-50 bg-black/85 text-white p-4 rounded-xl w-72 font-mono text-xs backdrop-blur-sm border border-white/10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold">Wood Texture</h3>
        {onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            className="text-white/60 hover:text-white"
          >
            [x]
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="mb-4">
        <label className="block text-white/60 mb-2">Preset</label>
        <div className="grid grid-cols-2 gap-1">
          {Object.keys(WOOD_PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => handlePresetChange(name)}
              className={`px-2 py-1.5 rounded text-[10px] transition-colors ${
                settings.preset === name
                  ? "bg-amber-600 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-white/60 mb-1">
            <span>Pixel Size</span>
            <span>{settings.pixelSize.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.2"
            step="0.005"
            value={settings.pixelSize}
            onChange={(e) => handleSliderChange("pixelSize", parseFloat(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-white/60 mb-1">
            <span>Grain Intensity</span>
            <span>{settings.grainIntensity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.grainIntensity}
            onChange={(e) => handleSliderChange("grainIntensity", parseFloat(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-white/60 mb-1">
            <span>Grain Scale</span>
            <span>{settings.grainScale.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={settings.grainScale}
            onChange={(e) => handleSliderChange("grainScale", parseFloat(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-white/60 mb-1">
            <span>Quantize Levels</span>
            <span>{settings.quantizeLevels}</span>
          </div>
          <input
            type="range"
            min="2"
            max="32"
            step="1"
            value={settings.quantizeLevels}
            onChange={(e) => handleSliderChange("quantizeLevels", parseFloat(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-white/60 mb-1">
            <span>Lighting</span>
            <span>{settings.lightingIntensity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={settings.lightingIntensity}
            onChange={(e) => handleSliderChange("lightingIntensity", parseFloat(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* Colors */}
      <div className="mt-4">
        <label className="block text-white/60 mb-2">Colors</label>
        <div className="grid grid-cols-4 gap-2">
          {(["colorDark", "colorMid", "colorLight", "colorHighlight"] as const).map((colorKey, i) => (
            <div key={colorKey} className="flex flex-col items-center">
              <input
                type="color"
                value={rgbToHex(settings[colorKey])}
                onChange={(e) => handleColorChange(colorKey, e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-2 border-white/20"
              />
              <span className="text-[8px] text-white/40 mt-1">
                {["Dark", "Mid", "Light", "Hi"][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current preset indicator */}
      <div className="mt-4 pt-3 border-t border-white/10 text-center text-white/40">
        {settings.preset === "custom" ? "Custom Settings" : `Preset: ${settings.preset}`}
      </div>
    </div>
  );
}

// Hook for easy usage
export function useWoodTextureSettings(initialPreset: string = "dark-walnut") {
  const [settings, setSettings] = useState<WoodTextureSettings>(
    WOOD_PRESETS[initialPreset] || WOOD_PRESETS["pixel-art"]
  );
  const [controlsVisible, setControlsVisible] = useState(true);

  const toggleControls = useCallback(() => {
    setControlsVisible((v) => !v);
  }, []);

  return {
    settings,
    setSettings,
    controlsVisible,
    toggleControls,
  };
}
