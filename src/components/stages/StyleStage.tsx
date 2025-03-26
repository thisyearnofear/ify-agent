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
        Choose Style or Transform
      </h3>

      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Overlays</h4>
        <div className="mb-4">
          <h5 className="text-xs text-gray-600 mb-2">Background Color</h5>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => updateControl("overlayColor", "#000000")}
              className={`w-6 h-6 rounded-full bg-black border-2 ${
                mode === "degenify"
                  ? "border-violet-400"
                  : "border-gray-200 hover:border-gray-400"
              } transition-colors`}
              aria-label="Black background"
            />
            <button
              onClick={() => updateControl("overlayColor", "#4F46E5")}
              className={`w-6 h-6 rounded-full bg-violet-600 border-2 ${
                mode === "higherify"
                  ? "border-violet-400"
                  : "border-gray-200 hover:border-gray-400"
              } transition-colors`}
              aria-label="Purple background"
            />
            <button
              onClick={() => updateControl("overlayColor", "#059669")}
              className={`w-6 h-6 rounded-full bg-emerald-600 border-2 ${
                mode === "scrollify"
                  ? "border-violet-400"
                  : "border-gray-200 hover:border-gray-400"
              } transition-colors`}
              aria-label="Green background"
            />
            <button
              onClick={() => updateControl("overlayColor", "#FFFFFF")}
              className={`w-6 h-6 rounded-full bg-white border-2 ${
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

        <div className="grid grid-cols-2 gap-2">
          <button
            data-theme="degenify"
            onClick={() => loadPresetOverlay("degenify")}
            className={`p-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1
              ${
                mode === "degenify"
                  ? "bg-violet-100 text-violet-800"
                  : "bg-violet-50 text-violet-700 hover:bg-violet-100"
              }`}
          >
            <span className="text-lg">🎩</span>
            <span className="text-xs font-medium">Degenify</span>
          </button>
          <button
            data-theme="higherify"
            onClick={() => loadPresetOverlay("higherify")}
            className={`p-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1
              ${
                mode === "higherify"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
          >
            <span className="text-lg">↑</span>
            <span className="text-xs font-medium">Higherify</span>
          </button>
          <button
            data-theme="scrollify"
            onClick={() => loadPresetOverlay("scrollify")}
            className={`p-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1
              ${
                mode === "scrollify"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
          >
            <span className="text-lg">📜</span>
            <span className="text-xs font-medium">Scrollify</span>
          </button>
          <button
            data-theme="baseify"
            onClick={() => loadPresetOverlay("baseify")}
            className={`p-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1
              ${
                mode === "baseify"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
          >
            <span className="text-lg">🔵</span>
            <span className="text-xs font-medium">Baseify</span>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 text-center mb-2">
          AI Transformations
        </h4>
        <div className="flex justify-center">
          <button
            data-theme="ghiblify"
            onClick={() => loadPresetOverlay("ghiblify")}
            className={`w-32 p-3 rounded-lg text-center transition-all flex flex-col items-center gap-1
              ${
                mode === "ghiblify"
                  ? "bg-pink-100 text-pink-800"
                  : "bg-pink-50 text-pink-700 hover:bg-pink-100"
              }`}
          >
            <span className="text-lg">✨</span>
            <span className="text-xs font-medium">Ghiblify</span>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={onStartOver}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2 mx-auto text-sm"
        >
          <span>←</span>
          <span>Start Over</span>
        </button>
      </div>
    </div>
  );
};
