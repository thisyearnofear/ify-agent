import { addTextToImage } from "../src/lib/image-processor";
import fs from "fs/promises";
import path from "path";
import { createCanvas, loadImage } from "canvas";

// Sample image URLs from the conversation
const sampleImageUrls = [
  "/Users/udingethe/Desktop/papa-code/ify-agent/test-images/0c67054a-92ec-4cce-8af8-f6532938bb03_preview.png",
  "/Users/udingethe/Desktop/papa-code/ify-agent/test-images/310ed933-c38d-45a6-a929-8bbd41ae41df_preview.png",
  "/Users/udingethe/Desktop/papa-code/ify-agent/test-images/995f1511-0560-4b4f-982c-1d69a9fa9709_preview.png",
];

// Text options to test
const textOptions = [
  {
    text: "Summer Vibes",
    position: "bottom",
    fontSize: 48,
    color: "blue",
    style: "bold",
  },
  {
    text: "HIGHER",
    position: "top",
    fontSize: 64,
    color: "white",
    style: "bold",
  },
  {
    text: "Digital Art",
    position: "bottom-right",
    fontSize: 36,
    color: "yellow",
    style: "monospace",
  },
];

async function testTextOverlay() {
  console.log("Starting text overlay test...");

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "test-output");
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  } catch (err) {
    console.log(`Output directory already exists: ${outputDir}`);
  }

  // Process each image with each text option
  for (let i = 0; i < sampleImageUrls.length; i++) {
    const imagePath = sampleImageUrls[i];
    console.log(`Processing image ${i + 1}: ${imagePath}`);

    try {
      // Check if the file exists
      try {
        await fs.access(imagePath);
      } catch (err) {
        console.error(`Image file not found: ${imagePath}`);
        continue;
      }

      // Read the image file
      const imageBuffer = await fs.readFile(imagePath);

      // Process with each text option
      for (let j = 0; j < textOptions.length; j++) {
        const option = textOptions[j];
        console.log(
          `  Applying text: "${option.text}" (${option.position}, ${option.fontSize}px, ${option.color})`
        );

        try {
          // Determine font style
          let fontFamily = "Arial";
          let fontWeight = "bold";

          if (option.style) {
            switch (option.style.toLowerCase()) {
              case "serif":
                fontFamily = "Times New Roman";
                break;
              case "monospace":
                fontFamily = "Courier New";
                break;
              case "handwriting":
                fontFamily = "Comic Sans MS";
                break;
              case "thin":
                fontWeight = "normal";
                break;
            }
          }

          // Determine position
          let x: "center" | "left" | "right" = "center";
          let y: "center" | "top" | "bottom" = "center";

          if (option.position) {
            if (option.position.includes("top")) y = "top";
            if (option.position.includes("bottom")) y = "bottom";
            if (option.position.includes("left")) x = "left";
            if (option.position.includes("right")) x = "right";
          }

          // Apply text to image
          const resultBuffer = await addTextToImage(imageBuffer, option.text, {
            x,
            y,
            fontSize: option.fontSize || 32,
            fontFamily,
            fontWeight,
            color: option.color || "white",
            strokeColor: "black",
            strokeWidth: 2,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: 10,
            align: "center",
            shadow: {
              color: "rgba(0, 0, 0, 0.7)",
              offsetX: 2,
              offsetY: 2,
              blur: 3,
            },
          });

          // Save the result
          const outputFilename = `image${i + 1}_text${j + 1}.png`;
          const outputPath = path.join(outputDir, outputFilename);
          await fs.writeFile(outputPath, resultBuffer);
          console.log(`  Saved to: ${outputPath}`);
        } catch (err) {
          console.error(
            `  Error applying text: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    } catch (err) {
      console.error(
        `Error processing image ${i + 1}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  console.log("Text overlay test completed!");
}

// Run the test
testTextOverlay().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
