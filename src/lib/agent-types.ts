import { OverlayMode } from "@/components/ImageOverlay";

export interface AgentCommand {
  command: string;
  parameters?: {
    baseImageUrl?: string;
    prompt?: string;
    overlayMode?: OverlayMode;
    action?: "generate" | "overlay" | "adjust" | "download";
    controls?: {
      scale?: number;
      x?: number;
      y?: number;
      overlayColor?: string;
      overlayAlpha?: number;
    };
  };
  callbackUrl?: string;
}

export interface AgentResponse {
  id: string;
  status: "processing" | "completed" | "failed";
  resultUrl?: string;
  previewUrl?: string;
  error?: string;
}

export interface ParsedCommand {
  action: "generate" | "overlay" | "adjust" | "download";
  prompt?: string;
  overlayMode?: OverlayMode;
  baseImageUrl?: string;
  controls?: {
    scale?: number;
    x?: number;
    y?: number;
    overlayColor?: string;
    overlayAlpha?: number;
  };
}
