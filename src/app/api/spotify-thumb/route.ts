import { NextResponse } from "next/server";

// Returns Spotify CDN artwork URL for a given track ID
// Uses the public Spotify OEmbed API — no auth required
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");

    if (!trackId || trackId.length !== 22) {
      return NextResponse.json({ error: "Invalid trackId" }, { status: 400 });
    }

    const oembedUrl = `https://open.spotify.com/oembed?url=spotify%3Atrack%3A${trackId}`;
    const res = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ArianatorsHub/1.0)"
      }
    });

    if (!res.ok) {
      // Fallback to a generic placeholder
      return NextResponse.redirect("/petal.jpg");
    }

    const data = await res.json();
    const thumbnailUrl: string = data.thumbnail_url || "";

    if (!thumbnailUrl) {
      return NextResponse.redirect(new URL("/petal.jpg", req.url));
    }

    // Redirect to the actual Spotify CDN image
    return NextResponse.redirect(thumbnailUrl);
  } catch (err) {
    return NextResponse.redirect(new URL("/petal.jpg", req.url));
  }
}
