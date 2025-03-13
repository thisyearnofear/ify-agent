import { ImageService } from "./image-service";
import { InterfaceType } from "@/lib/command-parser/index";

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
    interfaceType: InterfaceType
  ): ImageService {
    return this.getImageService();
  }
}
