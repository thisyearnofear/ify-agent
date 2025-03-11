import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

// Create a directory for test images
const testImagesDir = path.join(process.cwd(), "test-images");

// Image IDs from the conversation
const imageIds = [
  "0c67054a-92ec-4cce-8af8-f6532938bb03",
  "310ed933-c38d-45a6-a929-8bbd41ae41df",
  "995f1511-0560-4b4f-982c-1d69a9fa9709",
];

async function downloadImages() {
  console.log("Starting image download...");

  // Create test-images directory if it doesn't exist
  try {
    await fs.mkdir(testImagesDir, { recursive: true });
    console.log(`Created directory: ${testImagesDir}`);
  } catch (err) {
    console.log(`Directory already exists: ${testImagesDir}`);
  }

  // Download each image
  for (const imageId of imageIds) {
    const filename = `${imageId}_preview.png`;
    const filePath = path.join(testImagesDir, filename);

    try {
      // Check if file already exists
      try {
        await fs.access(filePath);
        console.log(`Image already exists: ${filePath}`);
        continue;
      } catch (err) {
        // File doesn't exist, proceed with download
      }

      // For this test, we'll create a placeholder image since we don't have the actual URLs
      // In a real scenario, you would use the actual image URLs
      console.log(`Creating placeholder for: ${filename}`);

      // Create a simple text file as a placeholder
      await fs.writeFile(filePath, `This is a placeholder for ${imageId}`);
      console.log(`Created placeholder: ${filePath}`);
    } catch (err) {
      console.error(
        `Error downloading image ${imageId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  console.log("Image download completed!");
  console.log(
    "Please replace the placeholder files with the actual images before running the test-text-overlay.ts script."
  );
}

// Run the download
downloadImages().catch((err) => {
  console.error("Download failed:", err);
  process.exit(1);
});
