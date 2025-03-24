# WOWOWIFY Telegram Agent Integration Guide

This guide provides instructions for integrating your Telegram bot with the WOWOWIFY image generation and overlay API.

## API Authentication

To authenticate your Telegram bot with our API, you will need to include the following headers in your requests:

```javascript
const headers = {
  "Content-Type": "application/json",
  "x-api-key": "process.env.TELEGRAM_API_KEY", // Your Telegram agent API key
  "x-agent-type": "external", // Required to identify as an external agent
};
```

## API Endpoint

The main endpoint to use is:

```
POST https://wowowifyer.vercel.app/api/agent
```

## Request Format

Your requests should follow this format:

```javascript
const requestBody = {
  command:
    "Generate an image of a mountain landscape and add the higherify overlay",
  // Optional additional parameters
  parameters: {
    baseImageUrl: "https://example.com/image.jpg", // Optional existing image URL
    overlayMode: "higherify", // Optional explicit overlay mode
    controls: {
      scale: 0.5, // Optional scale of overlay (0.1 to 2.0)
      x: 10, // Optional X position
      y: 20, // Optional Y position
      overlayColor: "#ff0000", // Optional color
      overlayAlpha: 0.8, // Optional opacity (0.0 to 1.0)
    },
    text: {
      content: "Hello World", // Text to add
      position: "bottom", // Position: top, bottom, center, etc.
      fontSize: 48, // Font size
      color: "white", // Text color
      style: "bold", // Style: serif, monospace, handwriting, bold, thin
      backgroundColor: "rgba(0,0,0,0.5)", // Optional background
    },
  },
};
```

## Example Implementation for Telegram Bot

Here's a simple example of how to integrate this with a Telegram bot using Node.js:

```javascript
const { Telegraf } = require("telegraf");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Initialize your Telegram bot
const bot = new Telegraf("YOUR_TELEGRAM_BOT_TOKEN");

// API configuration
const API_URL = "https://wowowifyer.vercel.app/api/agent";
const API_KEY = "process.env.TELEGRAM_API_KEY";

// Handle /generate command
bot.command("generate", async (ctx) => {
  try {
    // Extract the prompt from the command
    const prompt = ctx.message.text.replace(/^\/generate\s+/i, "");

    if (!prompt) {
      return ctx.reply(
        "Please provide a prompt. Example: /generate a mountain landscape with higherify overlay"
      );
    }

    // Inform user that we're generating the image
    const statusMessage = await ctx.reply(
      "Generating your image, please wait..."
    );

    // Call the WOWOWIFY API
    const response = await axios.post(
      API_URL,
      {
        command: prompt,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "x-agent-type": "external",
        },
      }
    );

    // Check if the generation was successful
    if (response.data.status === "completed" && response.data.resultUrl) {
      // Download the image
      const imageResponse = await axios.get(response.data.resultUrl, {
        responseType: "stream",
      });
      const imagePath = path.join(__dirname, "temp", `${Date.now()}.png`);

      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, "temp"))) {
        fs.mkdirSync(path.join(__dirname, "temp"));
      }

      // Save the image
      const writer = fs.createWriteStream(imagePath);
      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // Send the image to the user
      await ctx.replyWithPhoto({ source: imagePath });

      // Delete the temporary file
      fs.unlinkSync(imagePath);

      // Delete the status message
      await ctx.telegram.deleteMessage(ctx.chat.id, statusMessage.message_id);
    } else {
      // Handle error
      await ctx.reply(
        `Error generating image: ${response.data.error || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error("Error:", error);
    await ctx.reply(
      "Sorry, something went wrong while generating your image. Please try again later."
    );
  }
});

// Start the bot
bot.launch();
```

## Available Command Types

Your bot can use these command formats:

1. **Generate New Images:**

   ```
   Generate an image of a mountain landscape
   ```

2. **Apply Overlays:**

   ```
   Generate an image of a mountain landscape with higherify overlay
   ```

3. **Customize Overlays:**

   ```
   Generate an image of a mountain landscape with higherify overlay. Scale to 0.5. Position at 10, 20. Color to red. Opacity to 0.8.
   ```

4. **Add Text:**
   ```
   Generate an image of a mountain landscape --text "Mountain Adventure" --text-position top --text-size 48 --text-color white
   ```

## Available Overlay Modes

- `degenify` - Degen-style overlay
- `higherify` - Higher-style overlay
- `wowowify` - WOWOW-style overlay
- `scrollify` - Scroll-style overlay
- `lensify` - Lens-style overlay
- `higherise` - Higherise-style overlay
- `dickbuttify` - Dickbutt-style overlay
- `nikefy` - Nike-style overlay
- `nounify` - Nouns-style overlay
- `baseify` - Base-style overlay
- `clankerify` - Clanker-style overlay
- `mantleify` - Mantle-style overlay

## Response Format

The API will respond with a JSON object like this:

```json
{
  "id": "unique_request_id",
  "status": "completed", // or "processing", "failed"
  "resultUrl": "https://wowowifyer.vercel.app/api/image?id=unique_id", // URL to the resulting image
  "previewUrl": "https://wowowifyer.vercel.app/api/image?id=unique_id&preview=true", // Preview URL
  "error": "Error message if status is failed",
  "groveUri": "Optional Grove URI for lensify overlay",
  "groveUrl": "Optional Grove URL for lensify overlay"
}
```

## Rate Limits and Error Handling

- Regular users are limited to 20 requests per hour per IP
- Your Telegram bot has an elevated limit of 70 requests per hour
- Handle rate limiting errors (HTTP 429) by waiting and retrying later
- Monitor the rate limit headers in responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Tips for Best Performance

1. **Use Specific Prompts:** More detailed prompts yield better results.
2. **Handle Errors Gracefully:** Always handle API errors in your Telegram bot code.
3. **Optimize Image Delivery:** Consider using Telegram's native image upload for faster delivery.
4. **Cache Results:** If a user requests the same image multiple times, consider caching it.
5. **Monitor Usage:** Keep track of your API usage to avoid hitting rate limits.

## Need Help?

If you have any questions or encounter any issues, please reach out to the WOWOWIFY team for assistance.
