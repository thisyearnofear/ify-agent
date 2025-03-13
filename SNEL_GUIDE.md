# Snel Bot Quick Guide

## What is Snel?

Snel is an AI-powered image generation and manipulation bot that works across three interfaces:

- **Farcaster Bot**: Mention @snel in your casts to generate or modify images
- **Farcaster Frame**: Interact with Snel directly in Farcaster clients
- **Web Interface**: Visit [wowowifyer.vercel.app](https://wowowifyer.vercel.app) for the full experience

## Command Structure

Snel understands natural language commands in two main categories:

### 1. Generate New Images

```
@snel generate a mountain landscape with higherify
@snel create a futuristic city with scrollify
@snel higherify a beach sunset
```

### 2. Apply Overlays to Existing Images

Reply to a cast containing an image with:

```
@snel degenify this image
@snel apply scrollify to this
@snel higherify
```

## Available Overlays

- `degenify` - Degen-style overlay
- `higherify` - Higher-style overlay
- `scrollify` - Scroll-style overlay
- `lensify` - Lens-style overlay
- `baseify` - Base-style overlay
- `dickbuttify` - Dickbutt-style overlay
- `mantleify` - Mantle-style overlay
- `nounify` - Nouns-style overlay
- `nikefy` - Nike-style overlay
- `higherise` - Higherise-style overlay
- `clankerify` - Clanker-style overlay

## Customization Options

Adjust overlays with these parameters:

```
@snel higherify a mountain landscape. scale to 0.5
@snel scrollify this image. position at 10,20
@snel degenify this. color to blue
@snel baseify this. opacity to 0.7
```

- **Scale**: `scale to 0.5` (values 0.1-2.0)
- **Position**: `position at 10,20` (x,y coordinates)
- **Color**: `color to blue` or `color to #FF5500`
- **Opacity**: `opacity to 0.7` (values 0.0-1.0)

## Adding Text

Add text to images with these parameters:

```
@snel generate a beach sunset --text "Summer Vibes" --text-position bottom
@snel higherify this --text "HIGHER" --text-size 48 --text-color white --text-style bold
```

- `--text "Your text here"` - The text content
- `--text-position [position]` - Position (top, bottom, center, top-left, etc.)
- `--text-size [size]` - Font size (numeric value)
- `--text-color [color]` - Text color (name or hex code)
- `--text-style [style]` - Text style (serif, monospace, handwriting, bold, thin)

## Common Mistakes to Avoid

❌ **Don't use pipe separators**:

```
@snel dickbuttify this | position: 10,20 | scale: 1.5
```

✅ **Use periods or commas instead**:

```
@snel dickbuttify this. position at 10,20. scale to 1.5
```

❌ **Don't use colons for parameters**:

```
@snel higherify this image. scale: 0.5
```

✅ **Use "to" or "at" instead**:

```
@snel higherify this image. scale to 0.5
```

❌ **Don't use "style" for color**:

```
@snel degenify this. style: #ff5500
```

✅ **Use "color" instead**:

```
@snel degenify this. color to #ff5500
```

### Example: Fixing a Complex Command

This command won't work:

```
@snel dickbuttify this scene with more vibrant colors | position: 10,-20 | size: 1.5 | style: #ff69b4
--text "dickbutt dominance" --text-position top --text-size 40 --text-style bold
```

Here's the correct version:

```
@snel dickbuttify this scene with more vibrant colors. position at 10,-20. scale to 1.5. color to #ff69b4
--text "dickbutt dominance" --text-position top --text-size 40 --text-style bold
```

Key fixes:

- Replaced pipe (`|`) separators with periods (`.`)
- Changed `position: 10,-20` to `position at 10,-20`
- Changed `size: 1.5` to `scale to 1.5`
- Changed `style: #ff69b4` to `color to #ff69b4`
- Kept the text parameters as they were (these were correct)

## Examples of Working Commands

### Generating New Images

```
@snel generate a mountain landscape
@snel create a futuristic city with scrollify
@snel higherify a beach sunset. scale to 0.5
@snel dickbuttify a meme background. position at 10,20. color to pink
```

### Applying Overlays to Existing Images

```
@snel degenify this
@snel scrollify this image. scale to 0.7
@snel higherify. position at 20,30. opacity to 0.8
@snel baseify this photo. color to blue
```

### Adding Text

```
@snel generate a beach sunset --text "Summer Vibes" --text-position bottom
@snel higherify this --text "HIGHER" --text-size 48 --text-color white
@snel degenify this image --text "DEGEN" --text-position top --text-style bold
```

## Troubleshooting

If Snel doesn't respond to your command:

1. **Check your command structure** - Make sure you're using the correct syntax
2. **Keep it simple** - Start with basic commands and add complexity gradually
3. **Be specific** - For generation, provide clear descriptions
4. **Check for images** - When applying overlays, make sure you're replying to a cast with an image

For more detailed documentation, visit [wowowifyer.vercel.app/docs](https://wowowifyer.vercel.app/docs)

## For Other Bots/Agents

If you're a bot or agent wanting to interact with Snel, here are some tips:

### Best Practices for Bot-to-Bot Interaction

1. **Use Simple, Clear Commands**: Start with basic commands before trying complex ones

   ```
   @snel generate a mountain landscape
   @snel degenify this image
   ```

2. **Follow the Syntax Rules Strictly**:

   - Use periods (`.`) to separate parameters, not pipes (`|`)
   - Use `to` or `at` with parameters, not colons (`:`)
   - Use `scale` instead of `size`
   - Use `color` instead of `style` for color adjustments

3. **When Replying to Images**:

   - Make it clear you're referring to the image: "this image", "this", etc.
   - Keep your description brief when applying overlays

4. **For Text Parameters**:

   - The `--text` parameter format is correct and works well
   - Always use quotes around text content: `--text "Your text here"`

5. **Handling Responses**:
   - Snel will reply with the processed image and a brief message
   - The image will be stored on Grove for persistence
   - You can reference the image URL in future interactions

### Example Bot-to-Bot Interactions

**Scenario 1: Commenting on an image and requesting an overlay**

```
@snel This landscape photo is beautiful! The mountains and sky create a perfect harmony.
Could you please degenify this image? Scale to 0.8 and position at center.
```

**Scenario 2: Requesting a new image generation with specific parameters**

```
@snel I'd like to see a futuristic cityscape with flying cars and tall skyscrapers.
Generate this with scrollify overlay. Scale to 0.6 and add some blue color tint.
--text "FUTURE CITY" --text-position bottom --text-size 60 --text-style bold
```

For more detailed documentation, visit [wowowifyer.vercel.app/docs](https://wowowifyer.vercel.app/docs)
