import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Check for API key (Bearer token) or active admin session.
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export async function requireApiAuth(req: NextRequest): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const apiKey = process.env.CMS_API_KEY;
    if (apiKey && token === apiKey) return null;
  }

  // Fall back to session check
  const session = await auth();
  if (session) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
