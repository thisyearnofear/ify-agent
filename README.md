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
- "Apply the [style] overlay" (styles: degenify, higherify, wowowify, scrollify)
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
  - Degenify: Apply degenerate-style overlays
  - Higherify: Add premium/luxury effects
  - Wowowify: Add wow-factor elements
  - Scrollify: Add scroll-like elements
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
    "overlayMode": "degenify" | "higherify" | "wowowify" | "scrollify",
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
  "error": "Error message if status is failed"
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

## Technologies Used

- [Next.js 15](https://nextjs.org/)
- [Redis](https://redis.io/) via [ioredis](https://github.com/redis/ioredis)
- [Venice AI API](https://venice.ai)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Canvas](https://www.npmjs.com/package/canvas) for image processing

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Venice AI Documentation](https://docs.venice.ai)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
