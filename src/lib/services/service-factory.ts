import { ImageService } from "./image-service";
// Remove the unused import
// import { InterfaceType } from "../types";

/**
 * Factory class for creating services
 * This allows clients to get the appropriate service for their interface
 */
export class ServiceFactory {
  // Singleton instance of the image service
  private static imageService: ImageService;

  /**
   * Get an image service instance
   */
  public static getImageService(): ImageService {
    if (!this.imageService) {
      this.imageService = new ImageService();
    }
    return this.imageService;
  }

  /**
   * Get a service instance for the specified interface
   * Currently, we only have one image service for all interfaces,
   * but this could be extended in the future to provide specialized services
   */
  public static getServiceForInterface(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interfaceType: string // Parameter kept for future use but currently unused
  ): ImageService {
    return this.getImageService();
  }
}
