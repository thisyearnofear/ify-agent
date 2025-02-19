import { useState, useRef, useEffect, useCallback } from "react";
import debounce from "lodash/debounce";

interface ImageOverlayProps {
  overlayColor?: string;
  overlayAlpha?: number;
}

interface OverlayControls {
  scale: number;
  x: number;
  y: number;
}

type OverlayMode = "degenify" | "higherify" | "wowowify";

export default function ImageOverlay({
  overlayColor = "#000000",
  overlayAlpha = 0.5,
}: ImageOverlayProps) {
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [overlayImage, setOverlayImage] = useState<File | null>(null);
  const [basePreviewUrl, setBasePreviewUrl] = useState<string>("");
  const [overlayPreviewUrl, setOverlayPreviewUrl] = useState<string>("");
  const [combinedPreviewUrl, setCombinedPreviewUrl] = useState<string>("");
  const [mode, setMode] = useState<OverlayMode>("wowowify");
  const [controls, setControls] = useState<OverlayControls>({
    scale: 1,
    x: 0,
    y: 0,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleBaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBaseImage(file);
      const url = URL.createObjectURL(file);
      setBasePreviewUrl(url);
      // Clean up previous URL if it exists
      return () => URL.revokeObjectURL(url);
    }
  };

  const loadPresetOverlay = async (presetMode: OverlayMode) => {
    setMode(presetMode);
    const presetPath =
      presetMode === "degenify"
        ? "/degen/degenify.png"
        : presetMode === "higherify"
        ? "/higher/arrows/Arrow-png-white.png"
        : "";

    if (presetPath) {
      try {
        const response = await fetch(presetPath);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const file = new File([blob], `${presetMode}.png`, {
          type: "image/png",
        });
        setOverlayImage(file);
        const url = URL.createObjectURL(file);
        setOverlayPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error loading preset overlay:", error);
      }
    }
  };

  const handleOverlayImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (file.type === "image/svg+xml") {
          const svgUrl = URL.createObjectURL(file);
          const img = new Image();
          img.src = svgUrl;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not get canvas context");

          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(svgUrl);

          const pngUrl = canvas.toDataURL("image/png");
          const response = await fetch(pngUrl);
          const blob = await response.blob();
          const convertedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, "") + ".png",
            {
              type: "image/png",
            }
          );
          setOverlayImage(convertedFile);
          setOverlayPreviewUrl(pngUrl);
        } else {
          setOverlayImage(file);
          const url = URL.createObjectURL(file);
          setOverlayPreviewUrl(url);
          return () => URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error("Error processing overlay image:", error);
      }
    }
  };

  // Debounced version of combineImages
  const debouncedCombineImages = useCallback(() => {
    const combineImages = async () => {
      if (!baseImage || !overlayImage || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      try {
        // Load base image
        const baseImg = await loadImage(basePreviewUrl);

        // Set canvas size to match base image
        canvas.width = baseImg.width;
        canvas.height = baseImg.height;

        // Draw base image
        ctx.drawImage(baseImg, 0, 0);

        // Apply color overlay if needed
        if (overlayAlpha > 0) {
          ctx.fillStyle = overlayColor;
          ctx.globalAlpha = overlayAlpha;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
        }

        // Load and draw overlay image
        const overlayImg = await loadImage(overlayPreviewUrl);

        // Calculate scaled dimensions
        const scaledWidth = overlayImg.width * controls.scale;
        const scaledHeight = overlayImg.height * controls.scale;

        // Calculate position
        const x = (canvas.width - scaledWidth) / 2 + controls.x;
        const y = (canvas.height - scaledHeight) / 2 + controls.y;

        // Draw scaled and positioned overlay
        ctx.drawImage(overlayImg, x, y, scaledWidth, scaledHeight);

        // Update preview
        setCombinedPreviewUrl(canvas.toDataURL());
      } catch (error) {
        console.error("Error combining images:", error);
      }
    };

    const debouncedFn = debounce(combineImages, 16);
    debouncedFn();
    return () => debouncedFn.cancel();
  }, [
    baseImage,
    overlayImage,
    controls,
    overlayColor,
    overlayAlpha,
    basePreviewUrl,
    overlayPreviewUrl,
  ]);

  useEffect(() => {
    if (baseImage && overlayImage) {
      const cleanup = debouncedCombineImages();
      return cleanup;
    }
  }, [baseImage, overlayImage, debouncedCombineImages]);

  const handleDownload = () => {
    if (!combinedPreviewUrl) return;
    const link = document.createElement("a");
    link.href = combinedPreviewUrl;
    link.download = "combined-image.png";
    link.click();
  };

  const handleReset = () => {
    setBaseImage(null);
    setOverlayImage(null);
    setBasePreviewUrl("");
    setOverlayPreviewUrl("");
    setCombinedPreviewUrl("");
    setControls({ scale: 1, x: 0, y: 0 });
  };

  const updateControl = (key: keyof OverlayControls, value: number) => {
    setControls((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <label className="block text-lg font-medium text-gray-700 mb-4">
            img overlay
          </label>
          {!baseImage && (
            <div className="flex justify-center">
              <label className="px-6 py-3 bg-violet-50 text-violet-700 rounded-full cursor-pointer hover:bg-violet-100 transition-colors font-semibold text-sm">
                Choose File
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBaseImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {baseImage && (
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {/* Left side: Preview */}
            <div className="flex-1">
              <div className="relative group">
                <div className="w-full h-[70vh] relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={combinedPreviewUrl || basePreviewUrl}
                    alt={
                      combinedPreviewUrl ? "Combined preview" : "Base preview"
                    }
                    className="w-full h-full object-contain border rounded-lg shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg" />
                </div>
              </div>
            </div>

            {/* Right side: Controls */}
            <div className="w-full md:w-64 flex flex-col gap-4">
              {!overlayImage ? (
                // Style options
                <div className="animate-fadeIn">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
                    Choose Style
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-3">
                    <button
                      data-theme="degenify"
                      onClick={() => loadPresetOverlay("degenify")}
                      className={`p-2 md:p-4 rounded-lg transition-all flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 
                        bg-violet-50 text-violet-700 hover:bg-violet-100`}
                    >
                      <span className="text-xl md:text-2xl">🎩</span>
                      <span className="text-xs md:text-base font-medium">
                        Degenify
                      </span>
                    </button>
                    <button
                      data-theme="higherify"
                      onClick={() => loadPresetOverlay("higherify")}
                      className={`p-2 md:p-4 rounded-lg transition-all flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 
                        bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                    >
                      <span className="text-xl md:text-2xl">↑</span>
                      <span className="text-xs md:text-base font-medium">
                        Higherify
                      </span>
                    </button>
                    <button
                      data-theme="wowowify"
                      onClick={() => setMode("wowowify")}
                      className={`p-2 md:p-4 rounded-lg transition-all flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 
                        bg-gray-50 text-gray-700 hover:bg-gray-100`}
                    >
                      <span className="text-xl md:text-2xl">🤯</span>
                      <span className="text-xs md:text-base font-medium">
                        Wowowify
                      </span>
                    </button>
                  </div>

                  {/* Wowowify Upload Option */}
                  {mode === "wowowify" && (
                    <div className="animate-fadeIn mt-4">
                      <div className="relative">
                        <label
                          htmlFor="overlay-upload"
                          className="block w-full p-4 text-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                        >
                          <span className="text-2xl mb-2 block">📤</span>
                          <span className="text-sm text-gray-600">
                            Tap to upload overlay
                          </span>
                          <input
                            id="overlay-upload"
                            type="file"
                            accept="image/png,image/svg+xml"
                            onChange={handleOverlayImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Controls and actions
                <div className="animate-fadeIn">
                  <div
                    className={`mb-4 md:mb-6 ${
                      mode === "degenify"
                        ? "text-violet-700"
                        : mode === "higherify"
                        ? "text-emerald-700"
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
                          onChange={(e) =>
                            updateControl("x", parseInt(e.target.value))
                          }
                          className="w-full accent-current"
                        />
                        <span className="text-xs text-center">
                          X: {controls.x}px
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <input
                          type="range"
                          min="-500"
                          max="500"
                          value={controls.y}
                          onChange={(e) =>
                            updateControl("y", parseInt(e.target.value))
                          }
                          className="w-full accent-current"
                        />
                        <span className="text-xs text-center">
                          Y: {controls.y}px
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleDownload}
                      className={`flex-1 p-2 md:px-6 md:py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                        mode === "degenify"
                          ? "bg-violet-600 hover:bg-violet-700"
                          : mode === "higherify"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-gray-600 hover:bg-gray-700"
                      } text-white`}
                    >
                      <span className="hidden md:inline">Download</span>
                      <span>⬇️</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex-1 p-2 md:px-6 md:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="hidden md:inline">Start Over</span>
                      <span>🔄</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
