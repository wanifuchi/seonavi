import { NextRequest, NextResponse } from "next/server";
import { runTask07KeywordResearch } from "@/lib/agents/orchestrator-tasks";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { url, pages } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "競合サイトURLを指定してください" },
        { status: 400 }
      );
    }

    const result = await runTask07KeywordResearch(url, pages || 20);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Task07 error:", error);
    return NextResponse.json(
      { error: "キーワードリサーチに失敗しました" },
      { status: 500 }
    );
  }
}
