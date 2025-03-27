import { logger } from "../logger";
import { downloadImage } from "../image-processor";
import { uploadToGrove } from "../grove-storage";

export class GhibliService {
  async processImage(
    imageUrl: string,
    walletAddress?: string
  ): Promise<{ resultUrl: string; groveUrl?: string }> {
    try {
      // Special handling for imagedelivery.net URLs (Farcaster images)
      const isFarcasterImage = imageUrl.includes("imagedelivery.net");
      const finalImageUrl =
        isFarcasterImage && !imageUrl.includes("/original")
          ? `${imageUrl.split("?")[0]}/original`
          : imageUrl;

      logger.info("Processing image with Ghibli style", {
        originalUrl: imageUrl.substring(0, 100),
        finalUrl: finalImageUrl.substring(0, 100),
      });

      // Process the image using our backend API
      const response = await fetch("/api/replicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: finalImageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process image");
      }

      const { url: resultUrl } = await response.json();

      // Download the processed image for Grove upload
      const processedImage = await downloadImage(resultUrl);

      // Upload to Grove if wallet address is provided
      let groveUrl: string | undefined;
      if (walletAddress) {
        const uploadResult = await uploadToGrove(processedImage, walletAddress);
        groveUrl = uploadResult.uri;
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
