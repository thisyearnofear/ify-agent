import React, { JSX } from "react";

interface InitialStageProps {
  isGenerating: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateClick: () => void;
  LoadingText: () => JSX.Element;
}

export const InitialStage = ({
  isGenerating,
  onFileUpload,
  onGenerateClick,
  LoadingText,
}: InitialStageProps) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <label className="w-full sm:w-auto px-6 py-3 bg-violet-50 text-violet-700 rounded-full cursor-pointer hover:bg-violet-100 transition-colors font-semibold text-sm text-center">
          Choose File
          <input
            type="file"
            accept="image/*"
            onChange={onFileUpload}
            className="hidden"
          />
        </label>
        <span className="text-gray-400">or</span>
        <button
          onClick={onGenerateClick}
          disabled={isGenerating}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-violet-500 to-emerald-500 text-white rounded-full hover:from-violet-600 hover:to-emerald-600 transition-all font-semibold text-sm inline-flex items-center gap-2 min-w-[120px] justify-center"
        >
          {isGenerating ? (
            <LoadingText />
          ) : (
            <>
              <span>✨</span>
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
};
