# WOWOWIFY Agent

A Next.js application that provides AI-powered image generation using the Venice AI API, with built-in rate limiting and metrics tracking. It enables image overlays with predefined styles, logos, and filters as well as enabling the user to user their own images as overlays.

## Agent Integration

WOWOWIFY Agent can be controlled via natural language commands through its API, allowing external services to generate and manipulate images without interacting with the UI.

```bash
# Example: Generate an image with a wowowify overlay
curl -X POST https://your-app.com/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Generate an image of a mountain landscape and add the wowowify overlay"
  }'
```

The agent understands commands like:

- "Generate an image of [description]"
- "Apply the [style] overlay" (styles: degenify, higherify, wowowify, scrollify, lensify)
- "Position at [x], [y]"
- "Scale to [size]"
- "Set color to [color]"
- "Set opacity to [value]"

You can also provide structured parameters to override NLP extraction:

```json
{
  "command": "Generate a futuristic city",
  "parameters": {
    "overlayMode": "degenify",
    "controls": {
      "scale": 1.2,
      "x": 0,
      "y": 0,
      "overlayColor": "#ffffff",
      "overlayAlpha": 0.8
    }
  }
}
```

## Features

- 🎨 AI Image Generation using Venice AI
- 🖼️ Image Overlay System with multiple modes:
  - Lensify: Add lens-style overlays with Web3 storage via Grove
- 🎭 Custom image upload for both base images and overlays
- 🎛️ Advanced image controls:
  - Positioning (X/Y coordinates)
  - Scaling
  - Color filters
  - Opacity/transparency
- 💾 One-click download of combined images
- 🔒 Rate limiting with Redis
- 📊 Request metrics tracking
- 🚦 Error handling and timeout management
- 🔄 Automatic retries for Redis operations
- 📝 Comprehensive logging
- 🌳 Web3 storage integration with Grove (for Lensify overlay)

## Environment Setup

The application requires the following environment variables:

```bash
VENICE_API_KEY=your_venice_api_key
REDIS_URL=your_redis_url
```

You can obtain these from:

- Venice AI API key: [Venice AI Dashboard](https://venice.ai)
- Redis URL: [Upstash Redis](https://upstash.com)

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your environment variables
4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

### POST /api/generate

Generate an AI image with the following parameters:

```json
{
  "prompt": "your image description",
  "model": "stable-diffusion-3.5" | "fluently-xl",
  "hide_watermark": boolean
}
```

Rate limits:

- 20 requests per hour per IP
- Response headers include rate limit information

### POST /api/agent

Process natural language commands to generate and manipulate images:

```json
{
  "command": "your natural language command",
  "parameters": {
    "baseImageUrl": "optional URL to an existing image",
    "prompt": "optional prompt to override NLP extraction",
    "overlayMode": "degenify" | "higherify" | "wowowify" | "scrollify" | "lensify",
    "controls": {
      "scale": 1.2,
      "x": 0,
      "y": 0,
      "overlayColor": "#ffffff",
      "overlayAlpha": 0.8
    }
  },
  "callbackUrl": "optional URL for async processing"
}
```

Response:

```json
{
  "id": "unique_request_id",
  "status": "processing" | "completed" | "failed",
  "resultUrl": "URL to the processed image",
  "previewUrl": "URL to a preview of the processed image",
  "error": "Error message if status is failed",
  "groveUri": "Optional Grove URI for lensify overlay",
  "groveUrl": "Optional Grove URL for lensify overlay"
}
```

Rate limits:

- 20 requests per hour per IP
- Response headers include rate limit information

## Deployment

The application is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Deployment Considerations

When deploying to Vercel or other serverless environments, keep these important points in mind:

1. **Serverless Function Timeouts**:

   - Vercel functions have a default timeout of 10 seconds (Hobby plan) or 60 seconds (Pro plan)
   - Our application implements its own timeout handling to prevent hanging requests
   - If you experience timeouts, consider upgrading to a Pro plan

2. **Memory Storage**:

   - Images are stored in memory rather than the filesystem in production
   - This is because serverless functions have ephemeral filesystems
   - Images are automatically cleaned up to prevent memory leaks
   - Users should download images they want to keep

3. **Error Handling**:

   - The application implements robust error handling for API responses
   - Frontend code checks content types before parsing JSON
   - Detailed error messages are provided to help diagnose issues

4. **Architecture Notes**:

   - The agent route directly calls the Venice API to reduce API hops
   - Overlay images are loaded from public URLs rather than the filesystem
   - All image processing happens within a single serverless function

5. **Troubleshooting**:
   - If you see "Unexpected token" errors, it's likely a JSON parsing issue
   - Check that all API responses are properly formatted as JSON
   - Ensure timeouts are properly handled with AbortController
   - Verify that all environment variables are correctly set in Vercel

## Grove Integration

The application integrates with Grove, a secure, flexible, onchain-controlled storage layer for Web3 apps. When using the "lensify" overlay, the generated image is stored both in memory and on Grove.

### How it works

1. When a user requests an image with the "lensify" overlay, the application processes the image as usual.
2. After processing, the image is stored in memory like other overlays.
3. Additionally, the image is uploaded to Grove using the `@lens-chain/storage-client` library.
4. The response includes both the standard image URLs and Grove-specific URIs and URLs.
5. The UI displays Grove information when available, allowing users to access their images through Grove.

### Benefits

- **Persistent Storage**: Unlike in-memory storage, Grove provides more persistent storage for images.
- **Web3 Integration**: Images stored on Grove can be referenced in Web3 applications.
- **Access Control**: Grove supports various access control mechanisms for uploaded content.

## Farcaster Bot Integration

The application includes a webhook endpoint that allows your existing Farcaster bot to leverage our image generation and overlay capabilities. When someone mentions your bot on Farcaster, it can process the command and reply with the generated image.

### How It Works

The Farcaster integration directly leverages our existing agent API:

1. A user mentions your bot with a command on Farcaster (e.g., `@snel lensify a mountain landscape`)
2. Neynar sends a webhook event to our `/api/farcaster/webhook` endpoint
3. The webhook extracts the command and calls our agent API (`/api/agent`)
4. The agent API processes the command using the same infrastructure that powers the web UI
5. The webhook receives the result and replies to the original cast with the generated image

This architecture ensures that your Farcaster bot provides the exact same capabilities as our web UI, with no duplication of logic.

### Image Overlay Capabilities

The bot can work with images in two ways:

1. **Generate a new image with an overlay**: The bot can generate a new image based on your text prompt and apply an overlay to it.

   Example: `@snel degenify a futuristic city with neon lights. scale to 0.5.`

2. **Apply an overlay to an existing image**: When replying to a cast that contains an image, the bot can apply an overlay to that image.

   Example: `@snel degenify this image. scale to 0.3.`

The second capability is particularly powerful as it allows users to apply overlays to any image shared on Farcaster by simply replying to the cast containing the image and mentioning the bot with the desired overlay command.

### Example Commands

Here are some example commands you can use with the bot:

#### Generating New Images with Overlays

- `@snel Generate a mountain landscape` - Generates a new image
- `@snel degenify a futuristic city. scale to 0.5` - Generates an image with the degenify overlay
- `@snel higherify a beach sunset. opacity to 0.7` - Generates an image with the higherify overlay
- `@snel scrollify a minimalist tech background. color to blue` - Generates an image with the scrollify overlay
- `@snel lensify a professional portrait. scale to 0.4` - Generates an image with the lensify overlay

#### Applying Overlays to Existing Images

- `@snel degenify this image` - Applies the degenify overlay to the image in the parent cast
- `@snel higherify this image. scale to 0.3` - Applies the higherify overlay with scaling
- `@snel scrollify this image. position at 10, 20` - Applies the scrollify overlay with positioning
- `@snel lensify this image. opacity to 0.5` - Applies the lensify overlay with opacity adjustment
- `@snel overlay this image with degenify. color to red` - Applies the degenify overlay with color adjustment

### Customization Options

All overlays can be customized with the following parameters:

- **Scale**: `scale to 0.5` - Adjusts the size of the overlay (0.1 to 2.0)
- **Position**: `position at 10, 20` - Sets the X,Y coordinates of the overlay
- **Color**: `color to red` - Changes the color filter of the overlay
- **Opacity**: `opacity to 0.7` - Adjusts the transparency of the overlay (0.0 to 1.0)

### Storage

All images generated by the bot are stored on Grove for persistence, ensuring that they remain accessible even after the temporary URLs expire. The bot always replies with the Grove URL when available, providing a reliable link to the generated image.

### Setup

1. Create a Neynar account at [neynar.com](https://neynar.com) and get an API key
2. Create a Farcaster bot and get a signer UUID
3. Configure environment variables in your deployment:
   ```
   NEYNAR_API_KEY=your_neynar_api_key
   FARCASTER_SIGNER_UUID=your_farcaster_signer_uuid
   FARCASTER_BOT_FID=your_bot_fid
   NEXT_PUBLIC_APP_URL=https://your-app-url.com
   NEYNAR_WEBHOOK_SECRET=your_webhook_secret
   ```
4. Set up a webhook in the Neynar dashboard:
   - Event: `cast.created`
   - Filter: `mentioned_fids` = your bot's FID
   - Target URL: `https://your-app-url.com/api/farcaster/webhook`

### Access Control

By default, the bot is configured to respond only to authorized users. This is managed through a Redis-based allowed users list, which can be updated via the admin API. This ensures that the bot's resources are used only by approved users during testing and early deployment phases.

### Testing

You can test the webhook locally using the provided test script:

```bash
WEBHOOK_URL=http://localhost:3000/api/farcaster/webhook \
FARCASTER_BOT_FID=123456 \
COMMAND="lensify a mountain landscape" \
node scripts/test-farcaster-webhook.js
```

To test the image overlay functionality specifically, you can use:

```bash
WEBHOOK_URL=http://localhost:3000/api/farcaster/webhook \
FARCASTER_BOT_FID=123456 \
COMMAND="degenify this image" \
node scripts/test-farcaster-webhook.js
```

## Technologies Used

- [Next.js 15](https://nextjs.org/)
- [Redis](https://redis.io/) via [ioredis](https://github.com/redis/ioredis)
- [Venice AI API](https://venice.ai)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Canvas](https://www.npmjs.com/package/canvas) for image processing
- [Grove](https://grove.storage) for Web3 storage

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Venice AI Documentation](https://docs.venice.ai)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Grove Documentation](https://docs.grove.storage)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
