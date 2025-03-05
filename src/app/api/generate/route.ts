import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hide_watermark: false,
        model: "fluently-xl",
        prompt,
        width: 768,
        height: 768,
      }),
    };

    const response = await fetch(
      "https://api.venice.ai/api/v1/image/generate",
      options
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Venice API error: ${data.error || response.statusText}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
