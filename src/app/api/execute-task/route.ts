import { NextRequest, NextResponse } from "next/server";
import {
  runTask01ContentGap,
  runTask02SchemaAudit,
  runTask03Keywords,
  runTask04Positioning,
  runTask05GbpPosts,
  runTask06PostStrategy,
  runTask07KeywordResearch,
} from "@/lib/agents/orchestrator-tasks";

export const maxDuration = 60;

/**
 * テキストエリアの改行区切り文字列を配列に変換
 */
function splitLines(text: string): string[] {
  return text
    .split(/[\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, ...fields } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId が指定されていません" },
        { status: 400 }
      );
    }

    let result: string;

    switch (taskId) {
      case "content-gap": {
        const competitorUrls = splitLines(fields.competitorUrls || "");
        const urls = fields.myUrl
          ? [fields.myUrl, ...competitorUrls]
          : competitorUrls;
        if (urls.length < 2) {
          return NextResponse.json(
            { error: "自社URLと競合URLを合わせて2つ以上指定してください" },
            { status: 400 }
          );
        }
        result = await runTask01ContentGap(
          urls,
          fields.serviceName || "",
          fields.area || ""
        );
        break;
      }

      case "schema-audit": {
        if (!fields.targetUrl) {
          return NextResponse.json(
            { error: "対象ページURLを指定してください" },
            { status: 400 }
          );
        }
        result = await runTask02SchemaAudit(
          fields.targetUrl,
          fields.businessType || ""
        );
        break;
      }

      case "keyword-extraction": {
        if (!fields.serviceName || !fields.area) {
          return NextResponse.json(
            { error: "サービス名と対象エリアを指定してください" },
            { status: 400 }
          );
        }
        result = await runTask03Keywords(
          fields.serviceName,
          fields.area,
          fields.additionalContext || ""
        );
        break;
      }

      case "positioning-comparison": {
        const competitors = splitLines(fields.competitorUrls || "");
        if (!fields.myUrl || competitors.length < 1) {
          return NextResponse.json(
            { error: "自社URLと競合URLを指定してください" },
            { status: 400 }
          );
        }
        result = await runTask04Positioning(
          fields.myUrl,
          competitors,
          fields.serviceName || ""
        );
        break;
      }

      case "gbp-post-optimization": {
        if (!fields.serviceName || !fields.area) {
          return NextResponse.json(
            { error: "サービス名と対象エリアを指定してください" },
            { status: 400 }
          );
        }
        const keywords = fields.keywords
          ? splitLines(fields.keywords)
          : [];
        result = await runTask05GbpPosts(
          fields.serviceName,
          fields.area,
          keywords,
          fields.tone || ""
        );
        break;
      }

      case "posting-strategy": {
        if (!fields.serviceName || !fields.area) {
          return NextResponse.json(
            { error: "サービス名と対象エリアを指定してください" },
            { status: 400 }
          );
        }
        result = await runTask06PostStrategy(
          fields.serviceName,
          fields.area,
          fields.frequency || "",
          fields.platforms || ""
        );
        break;
      }

      case "keyword-research": {
        const urls = splitLines(fields.competitorUrls || "");
        if (urls.length < 1) {
          return NextResponse.json(
            { error: "競合サイトURLを指定してください" },
            { status: 400 }
          );
        }
        result = await runTask07KeywordResearch(
          urls,
          fields.serviceName || "",
          fields.area || ""
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: `不明なタスクID: ${taskId}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("execute-task error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "タスクの実行に失敗しました",
      },
      { status: 500 }
    );
  }
}
