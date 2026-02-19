import { NextRequest, NextResponse } from "next/server";
import { runTask04Positioning } from "@/lib/agents/orchestrator-tasks";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { myUrl, competitors } = await request.json();

    if (!myUrl || !competitors || !Array.isArray(competitors) || competitors.length < 1) {
      return NextResponse.json(
        { error: "自社URLと競合URLを指定してください" },
        { status: 400 }
      );
    }

    const result = await runTask04Positioning(myUrl, competitors);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Task04 error:", error);
    return NextResponse.json(
      { error: "ポジショニング比較に失敗しました" },
      { status: 500 }
    );
  }
}
