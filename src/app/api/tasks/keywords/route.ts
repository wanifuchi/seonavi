import { NextRequest, NextResponse } from "next/server";
import { runTask03Keywords } from "@/lib/agents/orchestrator-tasks";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { service, area, count } = await request.json();

    if (!service || !area) {
      return NextResponse.json(
        { error: "サービス名と地域名を指定してください" },
        { status: 400 }
      );
    }

    const result = await runTask03Keywords(service, area, count || 20);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Task03 error:", error);
    return NextResponse.json(
      { error: "キーワード抽出に失敗しました" },
      { status: 500 }
    );
  }
}
