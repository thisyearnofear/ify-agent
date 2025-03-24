import React from "react";
import { OverlayMode } from "../ImageOverlay";

interface StyleStageProps {
  mode: OverlayMode;
  controls: {
    overlayAlpha: number;
  };
  updateControl: (
    key: "overlayColor" | "overlayAlpha",
    value: string | number
  ) => void;
  loadPresetOverlay: (mode: OverlayMode) => void;
  onStartOver: () => void;
}

export const StyleStage = ({
  mode,
  controls,
  updateControl,
  loadPresetOverlay,
  onStartOver,
}: StyleStageProps) => {
  return (
    <div className="animate-fadeIn">
      <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
        Choose Style
      </h3>

      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Background</h4>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            onClick={() => updateControl("overlayColor", "#000000")}
            className={`w-8 h-8 rounded-full bg-black border-2 ${
              mode === "degenify"
                ? "border-violet-400"
                : "border-gray-200 hover:border-gray-400"
            } transition-colors`}
            aria-label="Black background"
          />
          <button
            onClick={() => updateControl("overlayColor", "#4F46E5")}
            className={`w-8 h-8 rounded-full bg-violet-600 border-2 ${
              mode === "higherify"
                ? "border-violet-400"
                : "border-gray-200 hover:border-gray-400"
            } transition-colors`}
            aria-label="Purple background"
          />
          <button
            onClick={() => updateControl("overlayColor", "#059669")}
            className={`w-8 h-8 rounded-full bg-emerald-600 border-2 ${
              mode === "scrollify"
                ? "border-violet-400"
                : "border-gray-200 hover:border-gray-400"
            } transition-colors`}
            aria-label="Green background"
          />
          <button
            onClick={() => updateControl("overlayColor", "#FFFFFF")}
            className={`w-8 h-8 rounded-full bg-white border-2 ${
              mode === "wowowify"
                ? "border-violet-400"
                : "border-gray-200 hover:border-gray-400"
            } transition-colors`}
            aria-label="White background"
          />
        </div>
        <div className="flex flex-col gap-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={controls.overlayAlpha}
            onChange={(e) =>
              updateControl("overlayAlpha", parseFloat(e.target.value))
            }
            className="w-full accent-current"
          />
          <span className="text-xs text-center">
            Opacity: {(controls.overlayAlpha * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-1 gap-2 md:gap-3">
        <button
          data-theme="degenify"
          onClick={() => loadPresetOverlay("degenify")}
          className={`p-2 md:p-4 rounded-lg transition-all flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 
            ${
              mode === "degenify"
                ? "bg-violet-100 text-violet-800"
                : "bg-violet-50 text-violet-700 hover:bg-violet-100"
            }`}
        >
          <span className="text-xl md:text-2xl">🎩</span>
          <span className="text-xs md:text-base font-medium">Degenify</span>
        </button>
        <button
          data-theme="higherify"
          onClick={() => loadPresetOverlay("higherify")}
          className={`p-2 md:p-4 rounded-lg transition-all flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 
            ${
              mode === "higherify"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
        >
          <span className="text-xl md:text-2xl">↑</span>
          <span className="text-xs md:text-base font-medium">Higherify</span>
        </button>
        <button
          data-theme="scrollify"
          onClick={() => loadPresetOverlay("scrollify")}
          className={`p-2 md:p-4 rounded-lg transition-all flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 
            ${
              mode === "scrollify"
                ? "bg-amber-100 text-amber-800"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
        >
          <span className="text-xl md:text-2xl">📜</span>
          <span className="text-xs md:text-base font-medium">Scrollify</span>
        </button>
        <button
          data-theme="baseify"
          onClick={() => loadPresetOverlay("baseify")}
          className={`p-2 md:p-4 rounded-lg transition-all flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 
            ${
              mode === "baseify"
                ? "bg-blue-100 text-blue-800"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
        >
          <span className="text-xl md:text-2xl">🔵</span>
          <span className="text-xs md:text-base font-medium">Baseify</span>
        </button>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={onStartOver}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2 mx-auto"
        >
          <span>←</span>
          <span>Start Over</span>
        </button>
      </div>
    </div>
  );
};
