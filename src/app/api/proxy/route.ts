import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy API route to fetch IPFS content and bypass CORS issues
 * This allows the frontend to fetch IPFS content without running into CORS errors
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    console.error("Proxy error: Missing URL parameter");
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 }
    );
  }

  console.log("Proxy request for URL:", url);

  try {
    // Validate that the URL is from allowed domains
    const allowedDomains = [
      "https://ipfs.io/ipfs/",
      "https://gateway.ipfs.io/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
      "https://lens.infura-ipfs.io/ipfs/",
    ];

    const isAllowedUrl = allowedDomains.some((domain) =>
      url.startsWith(domain)
    );

    if (!isAllowedUrl) {
      console.error("Proxy error: URL not from allowed domains:", url);
      return NextResponse.json(
        { error: "Only IPFS gateway URLs are supported" },
        { status: 400 }
      );
    }

    console.log("Fetching content from:", url);

    // Fetch the content with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Some gateways might require these headers
        "User-Agent": "Mozilla/5.0 (compatible; WowowifyProxy/1.0)",
        Accept: "image/*, */*",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `Proxy error: Failed to fetch from URL: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        { error: `Failed to fetch content: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the content type from the original response
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    console.log("Content type:", contentType);

    // Get the response as an array buffer
    const buffer = await response.arrayBuffer();
    console.log(`Successfully proxied ${buffer.byteLength} bytes`);

    // Return the proxied response with the same content type
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "Access-Control-Allow-Origin": "*", // Allow any origin to access this resource
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Proxy error:", errorMessage);

    if (errorMessage.includes("abort")) {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }

    return NextResponse.json(
      { error: `Failed to proxy content: ${errorMessage}` },
      { status: 500 }
    );
  }
}
