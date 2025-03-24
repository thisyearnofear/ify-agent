# WOWOWIFY Telegram Bot Integration

This README provides instructions for setting up a Telegram bot that integrates with the WOWOWIFY API for image generation and overlays.

## Prerequisites

Before you begin, make sure you have:

- Node.js (v14 or higher) installed
- A Telegram bot token (create one via [@BotFather](https://t.me/botfather))
- Basic understanding of JavaScript and Node.js
- Access to the WOWOWIFY API

## Getting Started

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/wowowify-telegram-bot.git
   cd wowowify-telegram-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with your bot token:

   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   ```

4. Start the bot:
   ```bash
   npm start
   ```

## Testing the API Integration

We've included a simple test script to verify your API integration works correctly:

1. Run the test script:

   ```bash
   node telegram-example.js
   ```

2. The script will:
   - Send several test commands to the API
   - Download and save generated images
   - Log responses and any errors

## Bot Commands

Configure your bot with the following commands via [@BotFather](https://t.me/botfather):

```
generate - Generate an image from text description
overlay - Apply an overlay to the last image
help - Show available commands and examples
```

## Implementation Details

The bot is built using:

- [Telegraf](https://github.com/telegraf/telegraf) - Modern Telegram Bot API framework for Node.js
- [Axios](https://github.com/axios/axios) - Promise-based HTTP client for API requests
- [dotenv](https://github.com/motdotla/dotenv) - Environment variable management

## Example Interaction

Users can interact with your bot using commands like:

```
/generate a mountain landscape with scrollify overlay
/generate a portrait of an astronaut with higherify overlay
/overlay degenify
/help
```

## Deploying the Bot

For production deployment, you can:

1. Use a service like [Vercel](https://vercel.com) or [Heroku](https://heroku.com)
2. Set up a webhook for better performance instead of long polling
3. Consider adding monitoring and error tracking

## API Authentication

The bot authenticates with the WOWOWIFY API using:

```javascript
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'process.env.VENICE_API_KEY',
  'x-agent-type': 'external'
}
```

## Rate Limits

- The Telegram bot has a higher rate limit (70 requests/hour) compared to standard users
- Monitor the rate limit headers in responses to avoid exceeding limits
- Implement proper error handling for rate limit errors (HTTP 429)

## Need Help?

See the full [TELEGRAM_AGENT_GUIDE.md](./TELEGRAM_AGENT_GUIDE.md) for detailed API documentation and implementation examples.

For additional issues or questions, reach out to the WOWOWIFY team.
