import { NextRequest, NextResponse } from "next/server";
import { runTask02SchemaAudit } from "@/lib/agents/orchestrator-tasks";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "監査対象URLを指定してください" },
        { status: 400 }
      );
    }

    const result = await runTask02SchemaAudit(url);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Task02 error:", error);
    return NextResponse.json(
      { error: "Schema監査に失敗しました" },
      { status: 500 }
    );
  }
}
