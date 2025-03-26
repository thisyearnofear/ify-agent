import { useState, useRef, useEffect, useCallback } from "react";
import debounce from "lodash/debounce";
import { InitialStage } from "./stages/InitialStage";
import { StyleStage } from "./stages/StyleStage";
import { AdjustStage } from "./stages/AdjustStage";
import { GenerateModal } from "./modals/GenerateModal";
import { LoadingText } from "./LoadingText";

interface OverlayControls {
  scale: number;
  x: number;
  y: number;
  overlayColor: string;
  overlayAlpha: number;
}

export type OverlayMode =
  | "degenify"
  | "higherify"
  | "wowowify"
  | "scrollify"
  | "lensify"
  | "higherise"
  | "dickbuttify"
  | "nikefy"
  | "nounify"
  | "baseify"
  | "clankerify"
  | "mantleify"
  | "ghiblify";
export type Stage = "initial" | "style" | "adjust";

export default function ImageOverlay() {
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [overlayImage, setOverlayImage] = useState<File | null>(null);
  const [basePreviewUrl, setBasePreviewUrl] = useState<string>("");
  const [overlayPreviewUrl, setOverlayPreviewUrl] = useState<string>("");
  const [combinedPreviewUrl, setCombinedPreviewUrl] = useState<string>("");
  const [mode, setMode] = useState<OverlayMode>("wowowify");
  const [isTransforming, setIsTransforming] = useState(false);
  const [controls, setControls] = useState<OverlayControls>({
    scale: 1,
    x: 0,
    y: 0,
    overlayColor: "#000000",
    overlayAlpha: 0.5,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("initial");

  const handleBaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBaseImage(file);
      const url = URL.createObjectURL(file);
      setBasePreviewUrl(url);
      setStage("style");
      return () => URL.revokeObjectURL(url);
    }
  };

  const loadPresetOverlay = async (presetMode: OverlayMode) => {
    setMode(presetMode);

    // For ghiblify, we don't need a preset overlay image
    if (presetMode === "ghiblify") {
      if (!baseImage || !basePreviewUrl) {
        alert("Please upload an image first");
        return;
      }

      setIsTransforming(true);
      setStage("adjust");

      try {
        // Convert base image to blob
        const imageBlob = await fetch(basePreviewUrl).then((r) => r.blob());
        const formData = new FormData();
        formData.append("image", imageBlob, "image.png");

        const response = await fetch("/api/replicate", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to transform image: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.url) {
          // Fetch the transformed image and create a local URL
          const transformedImageResponse = await fetch(result.url);
          const transformedImageBlob = await transformedImageResponse.blob();
          const transformedImageUrl = URL.createObjectURL(transformedImageBlob);
          setCombinedPreviewUrl(transformedImageUrl);
        } else {
          throw new Error("No transformed image URL received");
        }
      } catch (error) {
        console.error("Error transforming image:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to transform image. Please try again."
        );
        // Reset state on error
        setMode("wowowify");
        setStage("style");
      } finally {
        setIsTransforming(false);
      }
      return;
    }

    const presetPath =
      presetMode === "degenify"
        ? "/degen/degenify.png"
        : presetMode === "higherify"
        ? "/higher/arrows/Arrow-png-white.png"
        : presetMode === "scrollify"
        ? "/scroll/scrollify.png"
        : presetMode === "baseify"
        ? "/base/baseify.png"
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

        // Handle SVG conversion if needed
        const handleOverlayFile = async (file: File) => {
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
            return new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, "") + ".png",
              {
                type: "image/png",
              }
            );
          }
          return file;
        };

        const processedFile = await handleOverlayFile(file);
        setOverlayImage(processedFile);
        const url = URL.createObjectURL(processedFile);
        setOverlayPreviewUrl(url);
        setStage("adjust");
        return () => URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error loading preset overlay:", error);
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
        if (controls.overlayAlpha > 0) {
          ctx.fillStyle = controls.overlayColor;
          ctx.globalAlpha = controls.overlayAlpha;
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
  }, [baseImage, overlayImage, controls, basePreviewUrl, overlayPreviewUrl]);

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

  const handleBack = () => {
    if (stage === "adjust") {
      setOverlayImage(null);
      setOverlayPreviewUrl("");
      setStage("style");
    } else if (stage === "style") {
      setBaseImage(null);
      setBasePreviewUrl("");
      setCombinedPreviewUrl("");
      setStage("initial");
    }
    // Always clear generation state when going back
    setGenerationPrompt("");
    setIsGenerating(false);
  };

  const cleanupGenerationState = () => {
    setGenerationPrompt("");
    setIsGenerating(false);
    setShowGenerateModal(false);
  };

  const updateControl = (
    key: keyof OverlayControls,
    value: number | string
  ) => {
    if (key === "scale" || key === "x" || key === "y") {
      if (typeof value === "number") {
        setControls((prev) => ({ ...prev, [key]: value }));
      }
    } else {
      setControls((prev) => ({ ...prev, [key]: value }));
    }
  };

  const generateImage = async () => {
    if (!generationPrompt) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: generationPrompt,
          model: "stable-diffusion-3.5",
          hide_watermark: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to wowowify");
      }

      if (data.images?.[0]) {
        const base64 = data.images[0];
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/png" });

        const file = new File([blob], "generated-image.png", {
          type: "image/png",
        });
        setBaseImage(file);
        const url = URL.createObjectURL(file);
        setBasePreviewUrl(url);
        cleanupGenerationState();
        setStage("style");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      cleanupGenerationState();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-2 sm:p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-4 sm:mb-8">
          <label className="block text-base sm:text-lg font-medium text-gray-700">
            {stage === "initial"
              ? "img overlay tool"
              : stage === "style"
              ? "choose style"
              : mode === "ghiblify"
              ? "transforming image"
              : "adjust overlay"}
          </label>
        </div>

        {stage === "initial" && (
          <InitialStage
            isGenerating={isGenerating}
            onFileUpload={handleBaseImageUpload}
            onGenerateClick={() => setShowGenerateModal(true)}
            LoadingText={LoadingText}
          />
        )}

        {baseImage && (
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            <div className="flex-1">
              <div className="relative group">
                <div className="w-full h-[70vh] relative">
                  {isTransforming ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="mb-2">✨</div>
                        <div className="text-sm text-gray-600">
                          Transforming your image...
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={combinedPreviewUrl || basePreviewUrl}
                      alt={
                        combinedPreviewUrl ? "Combined preview" : "Base preview"
                      }
                      className="w-full h-full object-contain border rounded-lg shadow-lg"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="w-full md:w-64 flex flex-col gap-4">
              {stage === "style" ? (
                <StyleStage
                  mode={mode}
                  controls={controls}
                  updateControl={updateControl}
                  loadPresetOverlay={loadPresetOverlay}
                  onStartOver={() => {
                    setBaseImage(null);
                    setBasePreviewUrl("");
                    setCombinedPreviewUrl("");
                    setStage("initial");
                  }}
                />
              ) : (
                <AdjustStage
                  mode={mode}
                  controls={controls}
                  updateControl={updateControl}
                  onDownload={handleDownload}
                  onBack={handleBack}
                  showControls={mode !== "ghiblify"}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showGenerateModal && (
        <GenerateModal
          isGenerating={isGenerating}
          generationPrompt={generationPrompt}
          setGenerationPrompt={setGenerationPrompt}
          onGenerate={generateImage}
          onClose={cleanupGenerationState}
          LoadingText={LoadingText}
        />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
