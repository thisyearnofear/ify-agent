import React from "react";
import { OverlayMode } from "../ImageOverlay";

interface AdjustStageProps {
  mode: OverlayMode;
  controls: {
    scale: number;
    x: number;
    y: number;
  };
  updateControl: (key: "scale" | "x" | "y", value: number) => void;
  onDownload: () => void;
  onBack: () => void;
}

export const AdjustStage = ({
  mode,
  controls,
  updateControl,
  onDownload,
  onBack,
}: AdjustStageProps) => {
  return (
    <div className="animate-fadeIn">
      <div
        className={`mb-4 md:mb-6 ${
          mode === "degenify"
            ? "text-violet-700"
            : mode === "higherify"
            ? "text-emerald-700"
            : mode === "scrollify"
            ? "text-amber-700"
            : "text-gray-700"
        }`}
      >
        <div className="flex flex-row md:flex-col gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={controls.scale}
              onChange={(e) =>
                updateControl("scale", parseFloat(e.target.value))
              }
              className="w-full accent-current"
            />
            <span className="text-xs text-center">
              Scale: {controls.scale.toFixed(1)}x
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min="-500"
              max="500"
              value={controls.x}
              onChange={(e) => updateControl("x", parseInt(e.target.value))}
              className="w-full accent-current"
            />
            <span className="text-xs text-center">X: {controls.x}px</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min="-500"
              max="500"
              value={controls.y}
              onChange={(e) => updateControl("y", parseInt(e.target.value))}
              className="w-full accent-current"
            />
            <span className="text-xs text-center">Y: {controls.y}px</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onDownload}
          className={`flex-1 p-2 md:px-6 md:py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            mode === "degenify"
              ? "bg-violet-600 hover:bg-violet-700"
              : mode === "higherify"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : mode === "scrollify"
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-gray-600 hover:bg-gray-700"
          } text-white`}
        >
          <span className="hidden md:inline">Download</span>
          <span>⬇️</span>
        </button>
        <button
          onClick={onBack}
          className="flex-1 p-2 md:px-6 md:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
        >
          <span className="hidden md:inline">Back</span>
          <span>←</span>
        </button>
      </div>
    </div>
  );
};
