import { ImageService } from "./image-service";
import { logger } from "../logger";

/**
 * Valid interface types for services
 */
export type InterfaceType = "web" | "farcaster" | "telegram";

/**
 * Factory for creating services
 */
export class ServiceFactory {
  private static serviceInstance: ImageService | null = null;

  /**
   * Get a service for the specified interface type
   */
  public static getServiceForInterface(
    interfaceType: InterfaceType
  ): ImageService {
    // For now, we have a single image service implementation that handles all interfaces
    if (!this.serviceInstance) {
      logger.info(
        `Creating new ImageService instance for ${interfaceType} interface`
      );
      this.serviceInstance = new ImageService();
    } else {
      logger.info(
        `Reusing existing ImageService instance for ${interfaceType} interface`
      );
    }
    return this.serviceInstance;
  }
}
