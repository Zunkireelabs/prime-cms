import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const articles = await db.newsArticle.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json(articles);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireApiAuth(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const article = await db.newsArticle.create({ data: body });
    return NextResponse.json(article, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}
