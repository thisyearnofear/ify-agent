import React, { JSX } from "react";

interface GenerateModalProps {
  isGenerating: boolean;
  generationPrompt: string;
  setGenerationPrompt: (prompt: string) => void;
  onGenerate: () => void;
  onClose: () => void;
  LoadingText: () => JSX.Element;
}

export const GenerateModal = ({
  isGenerating,
  generationPrompt,
  setGenerationPrompt,
  onGenerate,
  onClose,
  LoadingText,
}: GenerateModalProps) => {
  const generateWithStyle = (type: string) => {
    const styles = [
      "surreal",
      "abstract",
      "fantasy",
      "isometric",
      "pop art",
      "sketch",
      "cyberpunk",
      "steampunk",
      "watercolor",
      "oil painting",
      "digital art",
      "minimalist",
      "retro",
      "vaporwave",
      "synthwave",
    ];

    const modifiers = [
      "with dramatic lighting",
      "in a mystical atmosphere",
      "with vibrant colors",
      "in a dreamy setting",
      "with neon accents",
      "in a cinematic style",
      "with ethereal glow",
      "in high contrast",
      "with soft pastels",
      "in bold colors",
    ];

    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomModifier =
      modifiers[Math.floor(Math.random() * modifiers.length)];

    const prompts = {
      landscape: [
        `${randomStyle} style majestic mountain landscape ${randomModifier}`,
        `${randomStyle} style serene beach at sunset ${randomModifier}`,
        `${randomStyle} style ancient ruins in a forest ${randomModifier}`,
        `${randomStyle} style floating islands in the sky ${randomModifier}`,
        `${randomStyle} style underwater city landscape ${randomModifier}`,
      ],
      animals: [
        `${randomStyle} style wild animals in their natural habitat ${randomModifier}`,
        `${randomStyle} style mythical creatures in an enchanted forest ${randomModifier}`,
        `${randomStyle} style majestic big cats in motion ${randomModifier}`,
        `${randomStyle} style exotic birds in a tropical paradise ${randomModifier}`,
        `${randomStyle} style underwater marine life scene ${randomModifier}`,
      ],
      sports: [
        `${randomStyle} style dynamic sports action moment ${randomModifier}`,
        `${randomStyle} style extreme sports in the mountains ${randomModifier}`,
        `${randomStyle} style urban street sports scene ${randomModifier}`,
        `${randomStyle} style futuristic sports arena ${randomModifier}`,
        `${randomStyle} style athletes in motion ${randomModifier}`,
      ],
      nature: [
        `${randomStyle} style lush rainforest with exotic flora ${randomModifier}`,
        `${randomStyle} style crystal cave with glowing minerals ${randomModifier}`,
        `${randomStyle} style northern lights over a frozen lake ${randomModifier}`,
        `${randomStyle} style cherry blossoms in full bloom ${randomModifier}`,
        `${randomStyle} style desert oasis under starry sky ${randomModifier}`,
      ],
    };

    const promptArray = prompts[type as keyof typeof prompts];
    const randomPrompt =
      promptArray[Math.floor(Math.random() * promptArray.length)];
    setGenerationPrompt(randomPrompt);
    onGenerate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => generateWithStyle("landscape")}
              className="p-3 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors text-sm font-medium"
            >
              Landscape
            </button>
            <button
              onClick={() => generateWithStyle("animals")}
              className="p-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
            >
              Animals
            </button>
            <button
              onClick={() => generateWithStyle("sports")}
              className="p-3 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors text-sm font-medium"
            >
              Sports
            </button>
            <button
              onClick={() => generateWithStyle("nature")}
              className="p-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
            >
              Nature
            </button>
          </div>

          <div className="relative flex flex-col gap-2">
            <textarea
              value={generationPrompt}
              onChange={(e) => {
                // Limit to 500 characters
                if (e.target.value.length <= 500) {
                  setGenerationPrompt(e.target.value);
                }
              }}
              placeholder="Or describe your image... (max 500 characters)"
              className="w-full px-4 py-3 border rounded-lg resize-none min-h-[80px] text-sm"
              rows={3}
            />
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-gray-500">
                {generationPrompt.length}/500 characters
              </span>
              <button
                onClick={onGenerate}
                disabled={isGenerating || !generationPrompt}
                className={`px-6 py-2 rounded-md transition-colors ${
                  isGenerating || !generationPrompt
                    ? "bg-gray-200 text-gray-500"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                {isGenerating ? <LoadingText /> : "Generate"}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
