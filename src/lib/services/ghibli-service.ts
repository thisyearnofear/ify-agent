import { logger } from "../logger";
import { downloadImage } from "../image-processor";
import { uploadToGrove } from "../grove-storage";

export class GhibliService {
  async processImage(
    imageUrl: string,
    walletAddress?: string
  ): Promise<{ resultUrl: string; groveUrl?: string }> {
    try {
      // Download the original image if it's a URL
      const originalImage = await downloadImage(imageUrl);

      // Process the image using our backend API
      const response = await fetch("/api/replicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process image");
      }

      const { resultUrl } = await response.json();

      // Download the processed image
      const processedImage = await downloadImage(resultUrl);

      // Upload to Grove if wallet address is provided
      let groveUrl: string | undefined;
      if (walletAddress) {
        groveUrl = await uploadToGrove(processedImage, walletAddress);
      }

      return {
        resultUrl,
        groveUrl,
      };
    } catch (error) {
      logger.error("Error in GhibliService.processImage", {
        error: error instanceof Error ? error.message : "Unknown error",
        imageUrl,
      });
      throw error;
    }
  }
}

export const ghibliService = new GhibliService();
