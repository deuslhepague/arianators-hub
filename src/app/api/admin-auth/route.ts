import { NextResponse } from "next/server";
import { generateAdminSessionToken } from "@/lib/adminAuth";

/**
 * Admin authentication endpoint
 * Verifies admin passcode against server-side environment variable
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passcode } = body;

    if (!passcode) {
      return NextResponse.json(
        { success: false, error: "Passcode required" },
        { status: 400 }
      );
    }

    const correctPasscode = process.env.ADMIN_PASSCODE;

    if (!correctPasscode) {
      console.warn("ADMIN_PASSCODE not configured in environment");
      return NextResponse.json(
        { success: false, error: "Admin authentication not configured" },
        { status: 500 }
      );
    }

    if (passcode === correctPasscode) {
      const sessionToken = generateAdminSessionToken();
      return NextResponse.json({
        success: true,
        sessionToken,
        expiresIn: 86400 // 24 hours in seconds
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid passcode" },
        { status: 401 }
      );
    }
  } catch (err: any) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
