import { NextResponse } from "next/server";
import { GET as spotifyGet } from "../spotify-users/route";

export async function GET(req: Request) {
  return spotifyGet(req);
}
