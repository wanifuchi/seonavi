/**
 * agent-runner.ts - AIエージェント呼び出しモジュール
 *
 * Vercel AI SDK (Google Gemini) を使って各サブエージェントを呼び出す。
 * 各エージェントの.mdファイルをsystem promptとして使用。
 */

import { generateText, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { readFileSync } from "fs";
import { join } from "path";

// エージェント名の型
export type AgentName =
  | "orchestrator"
  | "crawler"
  | "analyzer"
  | "schema"
  | "writer";

// デフォルトモデル（環境変数で上書き可能）
const DEFAULT_MODEL = "gemini-2.5-flash";

function getModel() {
  const modelId = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return google(modelId);
}

// エージェントプロンプトのキャッシュ
const promptCache = new Map<string, string>();

/**
 * エージェントのシステムプロンプトを取得
 */
function getAgentPrompt(agentName: AgentName): string {
  if (promptCache.has(agentName)) {
    return promptCache.get(agentName)!;
  }

  try {
    const promptPath = join(
      process.cwd(),
      "src",
      "lib",
      "agents",
      `${agentName}.md`
    );
    const prompt = readFileSync(promptPath, "utf-8");
    promptCache.set(agentName, prompt);
    return prompt;
  } catch {
    // フォールバック
    const fallback =
      "あなたはSEO分析の専門エージェントです。推測禁止。具体的データのみ日本語で出力してください。";
    promptCache.set(agentName, fallback);
    return fallback;
  }
}

/**
 * サブエージェントを呼び出し、結果テキストを返す
 */
export async function callSubAgent(
  agentName: AgentName,
  taskPrompt: string
): Promise<string> {
  const systemPrompt = getAgentPrompt(agentName);
  const model = getModel();

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: taskPrompt,
    maxOutputTokens: 8192,
  });

  return text;
}

/**
 * サブエージェントをストリーミングで呼び出す
 */
export function callSubAgentStream(
  agentName: AgentName,
  taskPrompt: string
) {
  const systemPrompt = getAgentPrompt(agentName);
  const model = getModel();

  return streamText({
    model,
    system: systemPrompt,
    prompt: taskPrompt,
    maxOutputTokens: 8192,
  });
}

/**
 * 進捗付きでオーケストレーターパイプラインを実行
 * onProgress コールバックで各ステップの状態を通知
 */
export async function runPipeline(
  steps: Array<{
    agent: AgentName;
    label: string;
    buildPrompt: (previousResults: string[]) => string;
  }>,
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    onProgress?.(i + 1, steps.length, step.label);

    const prompt = step.buildPrompt(results);
    const result = await callSubAgent(step.agent, prompt);
    results.push(result);
  }

  return results;
}
