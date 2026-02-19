import { NextRequest, NextResponse } from "next/server";
import { runTask06PostStrategy } from "@/lib/agents/orchestrator-tasks";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { area, service } = await request.json();

    if (!area || !service) {
      return NextResponse.json(
        { error: "地域名とサービス名を指定してください" },
        { status: 400 }
      );
    }

    const result = await runTask06PostStrategy(area, service);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Task06 error:", error);
    return NextResponse.json(
      { error: "投稿戦略設計に失敗しました" },
      { status: 500 }
    );
  }
}
