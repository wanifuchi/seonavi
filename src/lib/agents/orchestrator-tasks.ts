/**
 * orchestrator-tasks.ts - 各タスクのパイプライン定義
 *
 * URL取得は PageFetcher（実HTTP取得）を使用し、AI分析は Vercel AI SDK を使用。
 * フォームの全フィールドがAIプロンプトに反映されるよう設計。
 */

import { runPipeline } from "./agent-runner";
import {
  PageFetcher,
  PageData,
  createPageData,
} from "../tools/fetch-page";
import {
  SchemaExtractor,
  SchemaAuditor,
  formatAuditReport,
} from "../tools/extract-schema";
import { KeywordExtractor } from "../tools/keyword-tools";

// ---------- 共通ユーティリティ ----------

function now(): string {
  return new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

/**
 * serviceName/areaを能動的な分析指示として構築する。
 * 「背景情報」ではなく「分析の方向性を制御する指示」として使用。
 */
function buildAnalysisDirective(serviceName: string, area: string): string {
  if (serviceName && area) {
    return `\n\n## 分析の立場\nあなたは「${serviceName}」を${area}で提供する事業者のSEOコンサルタントです。\n${area}の地域特性を考慮し、「${serviceName}」の事業成長に直結する具体的な分析・提案を行ってください。`;
  }
  if (serviceName) {
    return `\n\n## 分析の立場\nあなたは「${serviceName}」のSEOコンサルタントです。事業成長に直結する具体的な分析・提案を行ってください。`;
  }
  return "";
}

/**
 * PageData配列をAI分析プロンプト用のMarkdown文字列に変換する。
 * 成功ページはSEO関連データを構造化、失敗ページはエラー情報を記載。
 */
function formatPageDataForAI(pages: PageData[]): string {
  const successCount = pages.filter((p) => p.status === "success").length;
  const totalCount = pages.length;

  const lines: string[] = [
    `## 取得結果サマリ`,
    `- 取得成功: ${successCount}/${totalCount} URL`,
  ];

  const failures = pages.filter((p) => p.status !== "success");
  if (failures.length > 0) {
    lines.push(`- 取得失敗: ${failures.length}/${totalCount} URL`);
    for (const f of failures) {
      lines.push(`  - ${f.url}: ${f.errorMessage || f.status}`);
    }
  }
  lines.push("", "---", "");

  for (const page of pages) {
    if (page.status === "success") {
      lines.push(`## ${page.url} (HTTP ${page.httpStatus} - 成功)`);
      lines.push(`- タイトル: ${page.title || "(なし)"}`);
      lines.push(`- H1: ${page.h1 || "(なし)"}`);
      if (page.h2List.length > 0) {
        lines.push(`- H2見出し: ${page.h2List.join(" | ")}`);
      }
      if (page.h3List.length > 0) {
        lines.push(`- H3見出し: ${page.h3List.slice(0, 20).join(" | ")}`);
      }
      lines.push(
        `- メタディスクリプション: ${page.metaDescription || "(なし)"}`,
      );
      if (page.navLinks.length > 0) {
        lines.push(
          `- ナビゲーション: ${page.navLinks.map((n) => n.text).join(" | ")}`,
        );
      }
      lines.push(`- 内部リンク数: ${page.internalLinks.length}`);
      lines.push(`- 文字数: ${page.wordCount}`);
      if (page.contentPreview) {
        lines.push(`- 本文冒頭: ${page.contentPreview}`);
      }
      if (page.jsonLd.length > 0) {
        lines.push(`- JSON-LD: ${page.jsonLd.length}件検出`);
      }
    } else {
      lines.push(`## ${page.url} (${page.status})`);
      lines.push(`- エラー: ${page.errorMessage}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * タスク実行用の並行ページ取得。
 * Vercelの60秒タイムアウトに適合するよう、短いタイムアウトと少ないリトライで取得。
 */
async function fetchPagesForTask(
  urls: string[],
  onProgress?: (step: number, total: number, label: string) => void,
): Promise<PageData[]> {
  onProgress?.(1, 99, "ページデータを取得中...");

  const fetcher = new PageFetcher({
    maxRetries: 1,
    retryWait: 1_000,
    timeout: 10_000,
  });

  // 全URLを並行取得
  const promises = urls.map((url) => fetcher.fetch(url));
  const settled = await Promise.allSettled(promises);

  const results: PageData[] = settled.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const page = createPageData(urls[i]);
    page.status = "error";
    page.errorMessage = `取得失敗: ${result.reason}`;
    return page;
  });

  const successCount = results.filter((r) => r.status === "success").length;
  if (successCount === 0) {
    throw new Error(
      `全URLの取得に失敗しました。\n${results.map((r) => `- ${r.url}: ${r.errorMessage}`).join("\n")}`,
    );
  }

  return results;
}

// ---------- Task01: コンテンツギャップ分析 ----------

export async function runTask01ContentGap(
  urls: string[],
  serviceName: string,
  area: string,
  onProgress?: (step: number, total: number, label: string) => void,
): Promise<string> {
  const directive = buildAnalysisDirective(serviceName, area);

  // Step 1: 実データ取得（AI crawlerを置き換え）
  const pages = await fetchPagesForTask(urls, onProgress);
  const crawlResult = formatPageDataForAI(pages);

  // Step 2-3: AI分析と記事テーマ生成
  const results = await runPipeline(
    [
      {
        agent: "analyzer",
        label: "ギャップ分析",
        buildPrompt: () => `
以下は競合サイトから実際に取得したSEOデータです。${directive}

${crawlResult}

## 分析タスク
上記の実データに基づき、以下を分析してください。

## 各サイトの主要トピック
| サイトドメイン | 主要トピック（H1/H2から抽出） |
|---|---|

## コンテンツギャップ
| ギャップテーマ | 扱っている競合数 | 機会分類 |${area ? ` ${area}での重要度 |` : ""}
|---|---|---|${area ? "---|" : ""}

ブルーオーシャンと参入余地を明確に分けて記載。
${serviceName ? `「${serviceName}」の主要サービスに関する記事の充実度を比較してください。` : ""}
${area ? `「${area}」の地域特化コンテンツで競合にあって自社にないものを重点的に分析してください。` : ""}`,
      },
      {
        agent: "writer",
        label: "記事テーマ生成",
        buildPrompt: ([analyzeResult]) => `
以下のコンテンツギャップ分析をもとに、上位表示を狙う記事テーマを5本作成してください。${directive}

${analyzeResult}

${area ? `必須条件:\n- 全タイトルに「${area}」を含めること\n- メインKWに「${area}」+サービス関連語を含めること\n- H2構成に地域密着の内容を1つ以上含めること` : ""}
${serviceName ? `- 「${serviceName}」の独自性を活かした差別化ポイントを明記` : ""}

各テーマを以下の形式で:
---
【記事テーマ No.X】
タイトル: （実際に使えるSEOタイトル 28〜32文字）
メインKW:
サブKW: KW1 / KW2 / KW3
H2構成:
  1.
  2.
  3.
  4. よくある質問（FAQ）
競合が扱っていない独自ポイント:
作成優先度: 高/中/低
---`,
      },
    ],
    (step, total, label) => onProgress?.(step + 1, total + 1, label),
  );

  const [analyzeResult, writeResult] = results;

  return `# ① コンテンツギャップ分析レポート

実行日時: ${now()}
${serviceName ? `サービス: ${serviceName}` : ""}${area ? ` | 地域: ${area}` : ""}
対象URL:
${urls.map((u) => `- ${u}`).join("\n")}

---

## クロール結果（実データ）

${crawlResult}

---

## ギャップ分析

${analyzeResult}

---

## 作成すべき記事テーマ（5本）

${writeResult}`;
}

// ---------- Task02: Schema監査 ----------

export async function runTask02SchemaAudit(
  url: string,
  businessType: string,
  onProgress?: (step: number, total: number, label: string) => void,
): Promise<string> {
  // Step 1: 実ページ取得（生HTML含む）
  onProgress?.(1, 3, "ページデータを取得中...");
  const fetcher = new PageFetcher({
    maxRetries: 1,
    retryWait: 1_000,
    timeout: 10_000,
  });
  const { html, pageData } = await fetcher.fetchRaw(url);

  if (pageData.status !== "success") {
    throw new Error(
      `ページの取得に失敗しました: ${pageData.errorMessage}`,
    );
  }

  // Step 2: ツールベースのSchema監査（AI不要）
  onProgress?.(2, 3, "Schema監査を実行中...");
  const extractor = new SchemaExtractor(html, url);
  const auditor = new SchemaAuditor(extractor);
  const auditResult = auditor.audit();
  const auditReport = formatAuditReport(auditResult);

  // Step 3: ビジネスタイプ固有のJSON-LD最適化（AI使用、任意）
  let aiEnhancement = "";
  if (businessType) {
    onProgress?.(3, 3, `${businessType}向けJSON-LD生成中...`);
    const [result] = await runPipeline([
      {
        agent: "schema",
        label: "ビジネスタイプ別JSON-LD最適化",
        buildPrompt: () => `
以下はWebページから実際に抽出したSchema監査レポートです。

${auditReport}

ビジネスタイプ: ${businessType}

上記の監査結果を踏まえ、「${businessType}」に最適化されたJSON-LDを生成してください。
既存Schemaの改善版と、不足Schemaの新規作成を行ってください。
ページから取得できた情報（タイトル: ${pageData.title}, 電話番号・住所等）は必ず反映してください。
出力: 改善・追加すべきJSON-LDコードのみ（解説不要）`,
      },
    ]);
    aiEnhancement = `\n\n---\n\n## ${businessType} 向けJSON-LD最適化（AI生成）\n\n${result}`;
  } else {
    onProgress?.(3, 3, "完了");
  }

  return `# ② Schema監査レポート

実行日時: ${now()}
対象URL: ${url}
${businessType ? `ビジネスタイプ: ${businessType}` : ""}

---

${auditReport}${aiEnhancement}`;
}

// ---------- Task03: キーワード抽出 ----------

export async function runTask03Keywords(
  serviceName: string,
  area: string,
  additionalContext: string,
  onProgress?: (step: number, total: number, label: string) => void,
): Promise<string> {
  const count = 20;
  const contextNote = additionalContext
    ? `\n\n補足情報: ${additionalContext}`
    : "";

  const results = await runPipeline(
    [
      {
        agent: "analyzer",
        label: "キーワード生成",
        buildPrompt: () => `
「${serviceName}」を「${area}」で提供するビジネス向け。
購入意欲の高いローカルキーワードを${count}個生成してください。${contextNote}

重視: ${area}の地域意図 / 緊急性（今すぐ・夜間・即日）/ 購入意図（費用・料金）/ 信頼確認（口コミ・評判）

出力形式: カテゴリ別Markdownテーブル
| キーワード | 月間検索Vol目安 | 購入意欲(1-10) | 難易度(1-10) | 推奨用途 |
各列を必ず埋めること:
- 月間検索Vol目安: あなたの知識から推定値を数値レンジで記載（例: 100-300, 500-1000, 1000-3000）。「要確認」は禁止。推定でよいので必ず数値を入れる
- 購入意欲: 1-10のスコア
- 難易度: 1-10のスコア（10が最難）
- 推奨用途: LP/GBP投稿/ブログ/メタタグ等の具体的な用途`,
      },
    ],
    onProgress,
  );

  return `# ③ 「今すぐ客」キーワード抽出レポート

実行日時: ${now()}
サービス: ${serviceName} | 地域: ${area}
${additionalContext ? `補足: ${additionalContext}` : ""}

---

${results[0]}

---

## 活用ガイド

1. **購入意欲スコア8以上** → ランディングページのH1・タイトルに使用
2. **緊急性キーワード** → GBP投稿・Google広告のコピーに活用
3. **地域意図キーワード** → エリアページ・トップページのメタタグに使用`;
}

// ---------- Task04: ポジショニング比較 ----------

export async function runTask04Positioning(
  myUrl: string,
  competitors: string[],
  serviceName: string,
  area: string,
  onProgress?: (step: number, total: number, label: string) => void,
): Promise<string> {
  const allUrls = [myUrl, ...competitors];
  const directive = buildAnalysisDirective(serviceName, area);

  // Step 1: 実データ取得
  const pages = await fetchPagesForTask(allUrls, onProgress);
  const crawlResult = formatPageDataForAI(pages);

  // Step 2: AI分析
  const results = await runPipeline(
    [
      {
        agent: "analyzer",
        label: "ポジショニング分析",
        buildPrompt: () => `
以下は実際に取得したWebサイトデータです。最初のURL（${myUrl}）が自社、残りが競合です。${directive}

${crawlResult}

## 分析タスク
上記の実データに基づき、以下を分析してください。

## 1. サービス比較表
## 2. 地域ターゲット比較
## 3. 信頼要素比較
## 4. 自社が弱い点（具体的に）
## 5. 自社の優位性（具体的に）
${area ? `\n「${area}」エリアでの競合優位性を重点的に分析してください。` : ""}

取得データに基づく事実のみ記載。推測禁止。`,
      },
    ],
    (step, total, label) => onProgress?.(step + 1, total + 1, label),
  );

  return `# ④ ポジショニング比較レポート

実行日時: ${now()}
${serviceName ? `サービス: ${serviceName}` : ""}${area ? ` | 地域: ${area}` : ""}
自社URL: ${myUrl}
競合URL: ${competitors.join(", ")}

---

## クロール結果（実データ）

${crawlResult}

---

${results[0]}`;
}

// ---------- Task05: GBP投稿最適化 ----------

export async function runTask05GbpPosts(
  serviceName: string,
  area: string,
  keywords: string[],
  tone: string,
  onProgress?: (step: number, total: number, label: string) => void,
): Promise<string> {
  const keywordNote =
    keywords.length > 0
      ? `\n\n使用するキーワード:\n${keywords.map((k) => `- ${k}`).join("\n")}`
      : "";
  const toneNote = tone ? `\nトーン・スタイル: ${tone}` : "";

  const results = await runPipeline(
    [
      {
        agent: "writer",
        label: "GBP投稿10本生成",
        buildPrompt: () => `
${area}の${serviceName}向けGBP（Googleビジネスプロフィール）投稿を10本作成してください。${keywordNote}${toneNote}

要件:
- 各投稿は150〜200文字
- ${area}のランドマークや地域特性を含む
- 「今すぐ電話」等のCTA必須
- 全投稿に「${area}」の地域名を自然に含めること
- 「${serviceName}」のブランド名を各投稿に1回以上含めること
${keywords.length > 0 ? `- 指定キーワードを積極的に使用` : "- SEOに効果的なキーワードを含む"}
${tone ? `- 「${tone}」なトーンで作成` : "- 親しみやすく信頼感のあるトーンで作成"}

---
【投稿No.X】
タイプ: （最新情報/イベント/特典）
テーマ:
本文:
CTA:
使用KW:
---`,
      },
    ],
    onProgress,
  );

  return `# ⑤ GBP投稿最適化レポート

実行日時: ${now()}
地域: ${area} | サービス: ${serviceName}
${keywords.length > 0 ? `指定KW: ${keywords.join(", ")}` : ""}
${tone ? `トーン: ${tone}` : ""}

---

## GBP投稿（10本）

${results[0]}`;
}

// ---------- Task06: 投稿戦略設計 ----------

export async function runTask06PostStrategy(
  serviceName: string,
  area: string,
  frequency: string,
  platforms: string,
  onProgress?: (step: number, total: number, label: string) => void,
): Promise<string> {
  const frequencyNote = frequency ? `\n目標投稿頻度: ${frequency}` : "";
  const platformNote = platforms
    ? `\n対象プラットフォーム: ${platforms}`
    : "";

  const results = await runPipeline(
    [
      {
        agent: "writer",
        label: "投稿戦略設計",
        buildPrompt: () => `
「${serviceName}」（${area}）に最適化された投稿戦略を設計してください。${frequencyNote}${platformNote}

${area}の地域特性（季節イベント・地域行事等）を考慮した投稿カレンダーを含めてください。

1. Googleマップ上位表示と相関する投稿パターン（根拠付き）
2. 推奨投稿頻度・タイミング${frequency ? `（希望: ${frequency}）` : ""}
3. 競合が使っていないキーワード5個と活用法
4. 月別重点テーマ（簡潔に）
5. 4週間分の週間投稿計画（曜日別テーマ・キーワード・CTA付き）
${platforms ? `6. ${platforms}それぞれに最適化した投稿アドバイス` : ""}

抽象論禁止。すぐ実行できる具体的内容のみ。`,
      },
    ],
    onProgress,
  );

  return `# ⑥ GBP投稿戦略レポート

実行日時: ${now()}
地域: ${area} | サービス: ${serviceName}
${frequency ? `投稿頻度: ${frequency}` : ""}
${platforms ? `プラットフォーム: ${platforms}` : ""}

---

## 戦略分析・提言

${results[0]}`;
}

// ---------- Task07: キーワードリサーチ ----------

export async function runTask07KeywordResearch(
  urls: string[],
  serviceName: string,
  area: string,
  onProgress?: (step: number, total: number, label: string) => void,
): Promise<string> {
  const directive = buildAnalysisDirective(serviceName, area);

  // Step 1: 実データ取得
  const pages = await fetchPagesForTask(urls, onProgress);
  const crawlResult = formatPageDataForAI(pages);

  // Step 1.5: ツールベースのキーワード事前抽出
  const extractor = new KeywordExtractor();
  const preExtractedKeywords: string[] = [];
  for (const page of pages) {
    if (page.status === "success") {
      const keywords = extractor.extractFromPage(page);
      preExtractedKeywords.push(...keywords);
    }
  }
  const uniqueKeywords = [...new Set(preExtractedKeywords)];

  const keywordSection =
    uniqueKeywords.length > 0
      ? `\n\n## ツールによる事前キーワード抽出結果\n以下はページのタイトル・H1・H2・メタディスクリプションからツールで自動抽出したキーワード候補です：\n${uniqueKeywords.slice(0, 50).join("、")}`
      : "";

  // Step 2: AI分析
  const results = await runPipeline(
    [
      {
        agent: "analyzer",
        label: "キーワード分析",
        buildPrompt: () => `
以下は競合サイトから実際に取得したページデータです。${directive}
${keywordSection}

${crawlResult}

## 分析タスク
上記の実データに基づき、優先順位付きキーワードテーブルを作成してください。
${serviceName ? `「${serviceName}」${area ? `（${area}）` : ""}のビジネスに役立つキーワードを優先的に抽出してください。` : ""}

| 優先度 | メインKW | 関連KW | 月間検索Vol目安 | 難易度(1-10) | 推奨アクション |
|---|---|---|---|---|---|

各列を必ず埋めること:
- 月間検索Vol目安: 推定値を数値レンジで記載（例: 100-300, 500-1000）。「要確認」は禁止
- 優先度: 高/中/低
- 推奨アクション: 具体的な施策（新規記事作成/既存ページ最適化/LP作成など）

テーブル後に最優先KW上位5個のサマリ（各KWに対する具体的な施策1行）を追記。`,
      },
    ],
    (step, total, label) => onProgress?.(step + 1, total + 1, label),
  );

  return `# ⑦ キーワードリサーチレポート

実行日時: ${now()}
競合サイト: ${urls.join(", ")}
${serviceName ? `サービス: ${serviceName}` : ""}${area ? ` | 地域: ${area}` : ""}

---

## クロール結果（実データ）

${crawlResult}

---

## キーワード分析（優先度付き）

${results[0]}`;
}
