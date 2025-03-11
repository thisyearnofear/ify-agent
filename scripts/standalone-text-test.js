const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// Sample image paths - update these to the actual paths of your images
const sampleImagePaths = [
  path.join(
    __dirname,
    "../test-images/0c67054a-92ec-4cce-8af8-f6532938bb03_preview.png"
  ),
  path.join(
    __dirname,
    "../test-images/310ed933-c38d-45a6-a929-8bbd41ae41df_preview.png"
  ),
  path.join(
    __dirname,
    "../test-images/995f1511-0560-4b4f-982c-1d69a9fa9709_preview.png"
  ),
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

/**
 * Adds text to an image
 * @param {Buffer} imageBuffer - The image buffer
 * @param {string} text - The text to add
 * @param {Object} options - Text options
 * @returns {Promise<Buffer>} - The resulting image buffer
 */
async function addTextToImage(imageBuffer, text, options = {}) {
  // Load the image
  const image = await loadImage(imageBuffer);

  // Create a canvas with the same dimensions as the image
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");

  // Draw the original image on the canvas
  ctx.drawImage(image, 0, 0, image.width, image.height);

  // Set default options
  const {
    x = "center",
    y = "center",
    fontSize = 32,
    fontFamily = "sans-serif",
    fontWeight = "bold",
    color = "white",
    strokeColor,
    strokeWidth = 0,
    backgroundColor,
    padding = 10,
    maxWidth = image.width - 40,
    lineHeight = 1.2,
    align = "center",
    rotation = 0,
    shadow,
  } = options;

  // Map style to system fonts
  let actualFontFamily = "sans-serif";
  if (fontFamily.toLowerCase().includes("mono")) {
    actualFontFamily = "monospace";
  } else if (
    fontFamily.toLowerCase().includes("serif") &&
    !fontFamily.toLowerCase().includes("sans")
  ) {
    actualFontFamily = "serif";
  }

  // Set font - use system fonts only
  try {
    // Calculate font size that will fit the image width
    let adaptedFontSize = fontSize;

    // Set initial font to measure text
    ctx.font = `${fontWeight} ${fontSize}px ${actualFontFamily}`;

    // Measure the text width
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;

    // If text is too wide, scale down the font
    if (textWidth > maxWidth) {
      adaptedFontSize = Math.floor(fontSize * (maxWidth / textWidth) * 0.9); // 0.9 for some margin
      adaptedFontSize = Math.max(12, adaptedFontSize); // Don't go below 12px
    }

    // Set the adapted font
    ctx.font = `${fontWeight} ${adaptedFontSize}px ${actualFontFamily}`;

    console.log(
      `Setting font: ${ctx.font} (adapted from ${fontSize}px to ${adaptedFontSize}px)`
    );
  } catch (error) {
    // Fallback to a very basic font if there's an error
    console.error(`Error setting font, using fallback: ${error.message}`);
    ctx.font = `${fontSize}px sans-serif`;
  }

  // Set text alignment
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  // Apply shadow if specified
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.shadowBlur = shadow.blur;
  }

  // Calculate position
  let posX;
  if (x === "center") {
    posX = image.width / 2;
  } else if (x === "left") {
    posX = padding;
    ctx.textAlign = "left";
  } else if (x === "right") {
    posX = image.width - padding;
    ctx.textAlign = "right";
  } else {
    posX = x;
  }

  let posY;
  if (y === "center") {
    posY = image.height / 2;
  } else if (y === "top") {
    posY = padding + fontSize / 2;
  } else if (y === "bottom") {
    posY = image.height - padding - fontSize / 2;
  } else {
    posY = y;
  }

  // Apply rotation if specified
  if (rotation !== 0) {
    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate((rotation * Math.PI) / 180);
    posX = 0;
    posY = 0;
  }

  // Split text into lines if it exceeds maxWidth
  const lines = wrapText(ctx, text, maxWidth);
  const totalHeight = lines.length * fontSize * lineHeight;

  // Draw background if specified
  if (backgroundColor) {
    const bgPadding = padding;
    const bgX =
      align === "left"
        ? posX
        : align === "right"
        ? posX - maxWidth
        : posX - maxWidth / 2;
    const bgY = posY - totalHeight / 2 - bgPadding;
    const bgWidth = maxWidth + bgPadding * 2;
    const bgHeight = totalHeight + bgPadding * 2;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  }

  // Draw each line of text
  ctx.fillStyle = color;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY =
      posY - totalHeight / 2 + i * fontSize * lineHeight + fontSize / 2;

    // Draw stroke if specified
    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(line, posX, lineY);
    }

    // Draw text
    ctx.fillText(line, posX, lineY);
  }

  // Restore context if rotated
  if (rotation !== 0) {
    ctx.restore();
  }

  // Convert canvas to buffer
  return canvas.toBuffer("image/png");
}

/**
 * Wraps text to fit within a maximum width
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width in pixels
 * @returns {string[]} - Array of lines
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Main test function
 */
async function testTextOverlay() {
  console.log("Starting standalone text overlay test...");

  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, "../test-output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  } else {
    console.log(`Output directory already exists: ${outputDir}`);
  }

  // Process each image with each text option
  for (let i = 0; i < sampleImagePaths.length; i++) {
    const imagePath = sampleImagePaths[i];
    console.log(`Processing image ${i + 1}: ${imagePath}`);

    try {
      // Check if the file exists
      if (!fs.existsSync(imagePath)) {
        console.error(`Image file not found: ${imagePath}`);
        continue;
      }

      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);

      // Process with each text option
      for (let j = 0; j < textOptions.length; j++) {
        const option = textOptions[j];
        console.log(
          `  Applying text: "${option.text}" (${option.position}, ${option.fontSize}px, ${option.color})`
        );

        try {
          // Convert style to font family and weight
          let fontFamily = "sans-serif";
          let fontWeight = "bold";

          if (option.style) {
            switch (option.style.toLowerCase()) {
              case "serif":
                fontFamily = "serif";
                break;
              case "monospace":
                fontFamily = "monospace";
                break;
              case "thin":
                fontWeight = "normal";
                break;
              default:
                // Keep defaults
                break;
            }
          }

          // Determine position
          let x = "center";
          let y = "center";
          if (option.position) {
            if (option.position.includes("top")) y = "top";
            if (option.position.includes("bottom")) y = "bottom";
            if (option.position.includes("left")) x = "left";
            if (option.position.includes("right")) x = "right";
          }

          // Add text to image
          const resultBuffer = await addTextToImage(imageBuffer, option.text, {
            x,
            y,
            fontSize: option.fontSize,
            fontFamily,
            fontWeight,
            color: option.color,
            strokeColor: "black",
            strokeWidth: 2,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: 10,
            shadow: {
              color: "rgba(0, 0, 0, 0.7)",
              offsetX: 2,
              offsetY: 2,
              blur: 3,
            },
          });

          // Save the result
          const outputPath = path.join(
            outputDir,
            `standalone_image${i + 1}_text${j + 1}.png`
          );
          fs.writeFileSync(outputPath, resultBuffer);
          console.log(`  Saved to: ${outputPath}`);
        } catch (err) {
          console.error(`  Error applying text: ${err.message || err}`);
        }
      }
    } catch (err) {
      console.error(`Error processing image ${i + 1}: ${err.message || err}`);
    }
  }

  console.log("Text overlay test completed!");
}

// Run the test
testTextOverlay().catch((err) => {
  console.error(`Error running test: ${err.message || err}`);
  process.exit(1);
});
