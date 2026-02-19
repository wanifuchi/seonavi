import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST() {
  return NextResponse.json(
    { error: "/api/execute-task を使用してください" },
    { status: 410 }
  );
}
