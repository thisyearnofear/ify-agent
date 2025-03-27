import { logger } from "../logger";
import { downloadImage } from "../image-processor";
import { uploadToGrove } from "../grove-storage";

export class GhibliService {
  private baseUrl: string;
  private maxRetries = 60; // Maximum number of retries (10 minutes with 10-second intervals)
  private retryInterval = 10000; // 10 seconds between retries

  constructor() {
    // Use environment variable for the base URL, fallback to localhost for development
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Log the base URL for debugging
    logger.info("Initialized GhibliService", {
      baseUrl: this.baseUrl,
    });
  }

  private async waitForPrediction(predictionId: string): Promise<string> {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        const response = await fetch(
          `${this.baseUrl}/api/replicate?id=${predictionId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to check prediction: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.status === "succeeded" && data.url) {
          return data.url;
        }

        if (data.status === "failed") {
          throw new Error("Image processing failed");
        }

        // If still processing, wait and retry
        await new Promise((resolve) => setTimeout(resolve, this.retryInterval));
        retries++;
      } catch (error) {
        logger.error("Error checking prediction status", {
          error: error instanceof Error ? error.message : "Unknown error",
          predictionId,
          retry: retries,
        });
        throw error;
      }
    }

    throw new Error("Timeout waiting for image processing");
  }

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
        baseUrl: this.baseUrl,
      });

      // Start the prediction
      const response = await fetch(`${this.baseUrl}/api/replicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: finalImageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        logger.error("Failed to start prediction", {
          status: response.status,
          statusText: response.statusText,
          error: error.error || "Unknown error",
        });
        throw new Error(
          error.error || `Failed to start prediction: ${response.statusText}`
        );
      }

      const { id: predictionId, status } = await response.json();
      if (!predictionId) {
        throw new Error("No prediction ID received");
      }

      logger.info("Started prediction", {
        predictionId,
        status,
      });

      // Wait for the prediction to complete
      const resultUrl = await this.waitForPrediction(predictionId);

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
        stack: error instanceof Error ? error.stack : undefined,
        imageUrl: imageUrl.substring(0, 100),
        baseUrl: this.baseUrl,
      });
      throw error;
    }
  }
}

export const ghibliService = new GhibliService();
