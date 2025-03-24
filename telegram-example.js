#!/usr/bin/env node

/**
 * WOWOWIFY Telegram API Test Example
 *
 * This script demonstrates how to interact with the WOWOWIFY API
 * from a Telegram bot. It simulates sending a command and handling
 * the response.
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// API configuration
const API_URL = "https://wowowifyer.vercel.app/api/agent";
const API_KEY = "process.env.VENICE_API_KEY";

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Test commands to try
const testCommands = [
  "Generate an image of a mountain landscape",
  "Generate an image of a sleek sports car with higherify overlay",
  "Generate an image of a cat wearing sunglasses with scrollify overlay, scale to 0.5",
  'Generate an image of a beach sunset --text "Summer Vibes" --text-position bottom --text-color white',
];

// Function to test API integration
async function testApiIntegration(command) {
  console.log(`\n🚀 Testing command: "${command}"`);
  console.log("Sending request to API...");

  try {
    const startTime = Date.now();

    // Call the WOWOWIFY API
    const response = await axios.post(
      API_URL,
      {
        command: command,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "x-agent-type": "external",
        },
      }
    );

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ API request completed in ${elapsedTime}s`);

    // Display rate limit info
    console.log("📊 Rate limit information:");
    console.log(`  - Limit: ${response.headers["x-ratelimit-limit"]}`);
    console.log(`  - Remaining: ${response.headers["x-ratelimit-remaining"]}`);
    console.log(`  - Reset: ${response.headers["x-ratelimit-reset"]}s`);

    // Check if the generation was successful
    if (response.data.status === "completed" && response.data.resultUrl) {
      console.log(`✅ Image generated successfully!`);
      console.log(`🖼️  Result URL: ${response.data.resultUrl}`);

      // Download the image
      const imageResponse = await axios.get(response.data.resultUrl, {
        responseType: "stream",
      });
      const fileName = `${Date.now()}_result.png`;
      const imagePath = path.join(tempDir, fileName);

      // Save the image
      const writer = fs.createWriteStream(imagePath);
      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      console.log(`💾 Image saved to: ${imagePath}`);

      // If specific overlay modes were detected
      if (response.data.overlayMode) {
        console.log(`🎨 Overlay mode used: ${response.data.overlayMode}`);
      }

      // If Grove URI is available (for lensify)
      if (response.data.groveUri) {
        console.log(`🔗 Grove URI: ${response.data.groveUri}`);
        console.log(`🌐 Grove URL: ${response.data.groveUrl}`);
      }

      return {
        success: true,
        imagePath,
        resultUrl: response.data.resultUrl,
      };
    } else {
      // Handle error
      console.error(`❌ Error: ${response.data.error || "Unknown error"}`);
      return {
        success: false,
        error: response.data.error || "Unknown error",
      };
    }
  } catch (error) {
    console.error("❌ Error connecting to API:");

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("  No response received from server");
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`  Error message: ${error.message}`);
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// Run all test commands sequentially
async function runAllTests() {
  console.log("🧪 WOWOWIFY TELEGRAM API TEST 🧪");
  console.log("================================");

  for (let i = 0; i < testCommands.length; i++) {
    const command = testCommands[i];
    console.log(`\nTest ${i + 1}/${testCommands.length}`);
    await testApiIntegration(command);
  }

  console.log("\n✨ All tests completed! ✨");
  console.log('\nTIP: Check the "temp" directory for the generated images.');
}

// Run the tests
runAllTests().catch(console.error);
