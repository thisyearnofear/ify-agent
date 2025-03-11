import { OverlayMode } from "@/components/ImageOverlay";

export interface AgentCommand {
  command: string;
  parameters?: {
    baseImageUrl?: string;
    prompt?: string;
    overlayMode?: OverlayMode | "lensify";
    action?: "generate" | "overlay" | "adjust" | "download";
    useParentImage?: boolean;
    controls?: {
      scale?: number;
      x?: number;
      y?: number;
      overlayColor?: string;
      overlayAlpha?: number;
    };
    text?: {
      content?: string;
      position?: string;
      fontSize?: number;
      color?: string;
      style?: string;
      backgroundColor?: string;
    };
  };
  callbackUrl?: string;
  parentImageUrl?: string; // URL of the parent cast's image
}

export interface AgentResponse {
  id: string;
  status: "processing" | "completed" | "failed";
  resultUrl?: string;
  previewUrl?: string;
  error?: string;
  groveUri?: string;
  groveUrl?: string;
}

export interface ParsedCommand {
  action: "generate" | "overlay" | "adjust" | "download";
  prompt?: string;
  overlayMode?: OverlayMode | "lensify";
  baseImageUrl?: string;
  useParentImage?: boolean; // Flag to use the parent cast's image
  controls?: {
    scale?: number;
    x?: number;
    y?: number;
    overlayColor?: string;
    overlayAlpha?: number;
  };
  text?: {
    content?: string;
    position?: string;
    fontSize?: number;
    color?: string;
    style?: string;
    backgroundColor?: string;
  };
}
