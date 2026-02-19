import { NextRequest, NextResponse } from "next/server";
import { runTask05GbpPosts } from "@/lib/agents/orchestrator-tasks";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { competitors, area, service } = await request.json();

    if (!competitors || !Array.isArray(competitors) || !area) {
      return NextResponse.json(
        { error: "競合URLと地域名を指定してください" },
        { status: 400 }
      );
    }

    const result = await runTask05GbpPosts(competitors, area, service || "葬儀");
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Task05 error:", error);
    return NextResponse.json(
      { error: "GBP投稿最適化に失敗しました" },
      { status: 500 }
    );
  }
}
