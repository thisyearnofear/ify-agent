import { NextResponse } from "next/server";

export const runtime = "edge"; // Edge runtime for better performance

const VENICE_API_URL = "https://api.venice.run/api/v1/images/generations";

export async function POST(req: Request) {
  console.log("Starting image generation request");
  try {
    // Validate request body
    let body;
    try {
      body = await req.json();
      console.log("Received request body:", {
        prompt: body.prompt,
        model: body.model,
      });
    } catch (e) {
      console.error("Invalid request body:", e);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { prompt, model } = body;

    if (!prompt) {
      console.error("No prompt provided");
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Verify API key exists
    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      console.error("API key not configured");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Call Venice API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      console.log("Calling Venice API...");
      const response = await fetch(VENICE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model: model || "stable-diffusion-3.5",
          n: 1,
          size: "1024x1024",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("Venice API response status:", response.status);

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response from Venice API:", {
          status: response.status,
          contentType,
          text,
        });
        return NextResponse.json(
          {
            error: "Invalid response from image service",
            details: text,
          },
          { status: 502 }
        );
      }

      const data = await response.json();
      console.log("Venice API response:", {
        ok: response.ok,
        status: response.status,
        hasImages: !!data.images,
      });

      if (!response.ok) {
        console.error("API error response:", data);
        return NextResponse.json(
          {
            error: data.error || "Failed to generate image",
            details: data,
          },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      console.error("Fetch error:", fetchError);

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return NextResponse.json(
            { error: "Request timeout" },
            { status: 504 }
          );
        }

        return NextResponse.json(
          {
            error: "Failed to generate image",
            details: fetchError.message,
          },
          { status: 500 }
        );
      }

      throw fetchError;
    }
  } catch (error: unknown) {
    console.error("Unhandled error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
