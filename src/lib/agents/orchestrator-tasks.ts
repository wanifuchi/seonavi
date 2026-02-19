/**
 * orchestrator-tasks.ts - 各タスクのパイプライン定義
 *
 * 各タスクは複数のサブエージェントを順番に呼び出し、結果を統合する。
 * フォームの全フィールドがAIプロンプトに反映されるよう設計。
 */

import { runPipeline } from "./agent-runner";

// ---------- 共通ユーティリティ ----------

function now(): string {
  return new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

// ---------- Task01: コンテンツギャップ分析 ----------

export async function runTask01ContentGap(
  urls: string[],
  serviceName: string,
  area: string,
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const serviceContext =
    serviceName && area
      ? `\n\n対象ビジネス: ${serviceName}（${area}）`
      : serviceName
        ? `\n\n対象ビジネス: ${serviceName}`
        : "";

  const results = await runPipeline(
    [
      {
        agent: "crawler",
        label: "競合サイトのクロール",
        buildPrompt: () => `
以下の競合サイトURLに順番にアクセスし、各サイトのSEO情報を取得してください。${serviceContext}

対象URL:
${urls.map((u) => `- ${u}`).join("\n")}

各URLから抽出:
1. サイト名・会社名
2. メインナビゲーションの全メニュー項目
3. ページタイトルタグ（最大20ページ）
4. H1・H2・H3タグのテキスト
5. メタディスクリプション

推測禁止。取得したデータのみJSON形式で報告してください。`,
      },
      {
        agent: "analyzer",
        label: "ギャップ分析",
        buildPrompt: ([crawlResult]) => `
以下は競合サイトの取得データです。${serviceContext}

${crawlResult}

## 各サイトの主要トピック
| サイトドメイン | 主要トピック（H1/H2から抽出） |
|---|---|

## コンテンツギャップ
| ギャップテーマ | 扱っている競合数 | 機会分類 |
|---|---|---|

ブルーオーシャンと参入余地を明確に分けて記載。${serviceName ? `\n\n「${serviceName}」の視点からギャップを分析してください。` : ""}`,
      },
      {
        agent: "writer",
        label: "記事テーマ生成",
        buildPrompt: ([, analyzeResult]) => `
以下のコンテンツギャップ分析をもとに、上位表示を狙う記事テーマを5本作成してください。${serviceContext}

${analyzeResult}

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
    onProgress
  );

  const [crawlResult, analyzeResult, writeResult] = results;

  return `# ① コンテンツギャップ分析レポート

実行日時: ${now()}
${serviceName ? `サービス: ${serviceName}` : ""}${area ? ` | 地域: ${area}` : ""}
対象URL:
${urls.map((u) => `- ${u}`).join("\n")}

---

## クロール結果

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
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const businessContext = businessType
    ? `\nビジネスタイプ: ${businessType}`
    : "";

  const results = await runPipeline(
    [
      {
        agent: "crawler",
        label: "ページ取得",
        buildPrompt: () =>
          `${url} にアクセスし、HTML全体のJSON-LD・Microdata・RDFaを取得してください。推測禁止。`,
      },
      {
        agent: "schema",
        label: "Schema監査・JSON-LD生成",
        buildPrompt: ([crawl]) => `
HTMLソース:
${crawl}
${businessContext}

全Schema構造化データを抽出・監査し、JSON-LDを生成してください。
${businessType ? `ビジネスタイプ「${businessType}」に適した@typeを使用してJSON-LDを生成してください。` : ""}
出力: 既存Schema一覧テーブル + 不足Schema優先度テーブル + 優先度「高」のJSON-LD`,
      },
    ],
    onProgress
  );

  return `# ② Schema監査レポート

実行日時: ${now()}
対象URL: ${url}
${businessType ? `ビジネスタイプ: ${businessType}` : ""}

---

${results[1]}`;
}

// ---------- Task03: キーワード抽出 ----------

export async function runTask03Keywords(
  serviceName: string,
  area: string,
  additionalContext: string,
  onProgress?: (step: number, total: number, label: string) => void
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
カテゴリ別Markdownテーブルで出力。ボリューム不明は「要GSC確認」と記載。`,
      },
    ],
    onProgress
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
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const allUrls = [myUrl, ...competitors];
  const serviceContext = serviceName
    ? `\n業種・サービス: ${serviceName}`
    : "";

  const results = await runPipeline(
    [
      {
        agent: "crawler",
        label: "全サイトのクロール",
        buildPrompt: () => `
以下のURLに順番にアクセスし、情報を取得してください。${serviceContext}

${allUrls.map((u) => `- ${u}`).join("\n")}

各URLから: 事業名・サービス一覧・対応地域・強み・信頼要素（口コミ数・資格等）・価格帯
推測禁止。取得できた情報のみ報告。`,
      },
      {
        agent: "analyzer",
        label: "ポジショニング分析",
        buildPrompt: ([crawl]) => `
クロール結果:
${crawl}

最初のURL（${myUrl}）が自社。残りが競合です。${serviceContext}

## 1. サービス比較表
## 2. 地域ターゲット比較
## 3. 信頼要素比較
## 4. 自社が弱い点（具体的に）
## 5. 自社の優位性（具体的に）
${serviceName ? `\n「${serviceName}」業界の視点で分析してください。` : ""}

推測禁止。取得データに基づく事実のみ。`,
      },
    ],
    onProgress
  );

  return `# ④ ポジショニング比較レポート

実行日時: ${now()}
${serviceName ? `サービス: ${serviceName}` : ""}
自社URL: ${myUrl}
競合URL: ${competitors.join(", ")}

---

${results[1]}`;
}

// ---------- Task05: GBP投稿最適化 ----------

export async function runTask05GbpPosts(
  serviceName: string,
  area: string,
  keywords: string[],
  tone: string,
  onProgress?: (step: number, total: number, label: string) => void
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
    onProgress
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
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const frequencyNote = frequency
    ? `\n目標投稿頻度: ${frequency}`
    : "";
  const platformNote = platforms
    ? `\n対象プラットフォーム: ${platforms}`
    : "";

  const results = await runPipeline(
    [
      {
        agent: "writer",
        label: "投稿戦略設計",
        buildPrompt: () => `
${area}の${serviceName}ビジネス向け投稿戦略を設計してください。${frequencyNote}${platformNote}

1. Googleマップ上位表示と相関する投稿パターン（根拠付き）
2. 推奨投稿頻度・タイミング${frequency ? `（希望: ${frequency}）` : ""}
3. 競合が使っていないキーワード5個と活用法
4. 月別重点テーマ（簡潔に）
5. 4週間分の週間投稿計画（曜日別テーマ・キーワード・CTA付き）
${platforms ? `6. ${platforms}それぞれに最適化した投稿アドバイス` : ""}

抽象論禁止。すぐ実行できる具体的内容のみ。`,
      },
    ],
    onProgress
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

// ---------- Task07: キーワードリサーチ高速化 ----------

export async function runTask07KeywordResearch(
  urls: string[],
  serviceName: string,
  area: string,
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const pages = 20;
  const serviceContext =
    serviceName && area
      ? `\n\n分析の視点: ${serviceName}（${area}）`
      : serviceName
        ? `\n\n分析の視点: ${serviceName}`
        : "";

  const results = await runPipeline(
    [
      {
        agent: "crawler",
        label: "競合サイトクロール",
        buildPrompt: () => `
以下の競合サイトの上位${pages}ページを取得してください。

対象URL:
${urls.map((u) => `- ${u}`).join("\n")}

手順: /sitemap.xml → ナビゲーション → 内部リンクの順に収集。
各ページ: URL・タイトル・H1・メタディスクリプション・本文冒頭200文字を取得。
JSON形式で出力。推測禁止。`,
      },
      {
        agent: "analyzer",
        label: "キーワード分析",
        buildPrompt: ([crawl]) => `
競合ページデータ:
${crawl}
${serviceContext}

${serviceName ? `「${serviceName}」${area ? `（${area}）` : ""}のビジネスに役立つキーワードを優先的に抽出してください。` : ""}

優先順位付きテーブル:
| 優先度 | URL | メインKW | 関連KW | 検索Vol目安 | 難易度(1-10) | 上位表示難度 |
|---|---|---|---|---|---|---|

- 高: 検索Vol大 × 難易度低（ブルーオーシャン）
- 中: バランスが良い
- 低: 難易度高い

Vol不明は「要Ahrefs確認」。テーブル後に最優先KW上位5個をサマリで追記。`,
      },
    ],
    onProgress
  );

  return `# ⑦ キーワードリサーチ高速化レポート

実行日時: ${now()}
競合サイト: ${urls.join(", ")}
${serviceName ? `サービス: ${serviceName}` : ""}${area ? ` | 地域: ${area}` : ""}
分析ページ数: ${pages}

---

## クロール結果

${results[0]}

---

## キーワード分析（優先度付き）

${results[1]}`;
}
