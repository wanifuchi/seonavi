import { NextRequest, NextResponse } from "next/server";
import { runTask01ContentGap } from "@/lib/agents/orchestrator-tasks";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length < 2) {
      return NextResponse.json(
        { error: "競合URLを2つ以上指定してください" },
        { status: 400 }
      );
    }

    const result = await runTask01ContentGap(urls);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Task01 error:", error);
    return NextResponse.json(
      { error: "コンテンツギャップ分析に失敗しました" },
      { status: 500 }
    );
  }
}
