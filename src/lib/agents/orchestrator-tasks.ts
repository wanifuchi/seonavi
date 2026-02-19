/**
 * orchestrator-tasks.ts - 各タスクのパイプライン定義
 *
 * Python版 orchestrator.py の各タスク処理フローをTypeScriptに移植。
 * 各タスクは複数のサブエージェントを順番に呼び出し、結果を統合する。
 */

import { callSubAgent, runPipeline } from "./agent-runner";

// ---------- 共通ユーティリティ ----------

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

function now(): string {
  return new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

// ---------- Task01: コンテンツギャップ分析 ----------

export async function runTask01ContentGap(
  urls: string[],
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const results = await runPipeline(
    [
      {
        agent: "crawler",
        label: "競合サイトのクロール",
        buildPrompt: () => `
以下の競合サイトURLに順番にアクセスし、各サイトのSEO情報を取得してください。

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
以下は競合サイトの取得データです。

${crawlResult}

## 各サイトの主要トピック
| サイトドメイン | 主要トピック（H1/H2から抽出） |
|---|---|

## コンテンツギャップ
| ギャップテーマ | 扱っている競合数 | 機会分類 |
|---|---|---|

ブルーオーシャンと参入余地を明確に分けて記載。`,
      },
      {
        agent: "writer",
        label: "記事テーマ生成",
        buildPrompt: ([, analyzeResult]) => `
以下のコンテンツギャップ分析をもとに、上位表示を狙う記事テーマを5本作成してください。

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
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const results = await runPipeline(
    [
      {
        agent: "crawler",
        label: "ページ取得",
        buildPrompt: () =>
          `${url} にアクセスし、JSON-LD・Microdata・RDFaを取得してください。推測禁止。`,
      },
      {
        agent: "schema",
        label: "Schema監査・JSON-LD生成",
        buildPrompt: ([crawl]) => `
HTMLソース:
${crawl}
全Schema構造化データを抽出・監査し、JSON-LDを生成してください。
出力: 既存Schema一覧テーブル + 不足Schema優先度テーブル + 優先度「高」のJSON-LD`,
      },
    ],
    onProgress
  );

  return `# ② Schema監査レポート

実行日時: ${now()}
対象URL: ${url}

---

${results[1]}`;
}

// ---------- Task03: キーワード抽出 ----------

export async function runTask03Keywords(
  service: string,
  area: string,
  count: number = 20,
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const results = await runPipeline(
    [
      {
        agent: "analyzer",
        label: "キーワード生成",
        buildPrompt: () => `
「${service}」を「${area}」で提供するビジネス向け。
購入意欲の高いローカルキーワードを${count}個生成してください。

重視: ${area}の地域意図 / 緊急性（今すぐ・夜間・即日）/ 購入意図（費用・料金）/ 信頼確認（口コミ・評判）
カテゴリ別Markdownテーブルで出力。ボリューム不明は「要GSC確認」と記載。`,
      },
    ],
    onProgress
  );

  return `# ③ 「今すぐ客」キーワード抽出レポート

実行日時: ${now()}
サービス: ${service} | 地域: ${area}

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
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const allUrls = [myUrl, ...competitors];

  const results = await runPipeline(
    [
      {
        agent: "crawler",
        label: "全サイトのクロール",
        buildPrompt: () => `
以下のURLに順番にアクセスし、情報を取得してください。

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

最初のURL（${myUrl}）が自社。残りが競合です。

## 1. サービス比較表
## 2. 地域ターゲット比較
## 3. 信頼要素比較
## 4. 自社が弱い点（具体的に）
## 5. 自社の優位性（具体的に）

推測禁止。取得データに基づく事実のみ。`,
      },
    ],
    onProgress
  );

  return `# ④ ポジショニング比較レポート

実行日時: ${now()}
自社URL: ${myUrl}
競合URL: ${competitors.join(", ")}

---

${results[1]}`;
}

// ---------- Task05: GBP投稿最適化 ----------

export async function runTask05GbpPosts(
  competitorUrls: string[],
  area: string,
  service: string = "葬儀",
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const results = await runPipeline(
    [
      {
        agent: "crawler",
        label: "競合GBP分析",
        buildPrompt: () => `
以下の競合GBP/Webサイトにアクセスし、投稿情報を取得してください。

${competitorUrls.map((u) => `- ${u}`).join("\n")}

取得: 投稿タイプ・頻度・テーマ・CTAの文言・使用キーワード
取得できない場合は「取得不可」と記載。推測禁止。`,
      },
      {
        agent: "writer",
        label: "GBP投稿10本生成",
        buildPrompt: ([crawl]) => `
競合分析:
${crawl}

${area}の${service}向けGBP投稿を10本作成。
要件: 150〜200文字 / ${area}のランドマーク含む / 「今すぐ電話」CTA必須 / 競合未使用KWを積極使用

---
【投稿No.X】
タイプ: / テーマ: / 本文: / CTA: / 使用KW:
---`,
      },
    ],
    onProgress
  );

  return `# ⑤ GBP投稿最適化レポート

実行日時: ${now()}
地域: ${area} | サービス: ${service}

---

## 競合GBP分析

${results[0]}

---

## GBP投稿（10本）

${results[1]}`;
}

// ---------- Task06: 投稿戦略設計 ----------

export async function runTask06PostStrategy(
  area: string,
  service: string,
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const results = await runPipeline(
    [
      {
        agent: "writer",
        label: "投稿戦略設計",
        buildPrompt: () => `
${area}の${service}ビジネス向けGBP投稿戦略を設計してください。

1. Googleマップ上位表示と相関する投稿パターン（根拠付き）
2. 推奨投稿頻度・タイミング
3. 競合が使っていないキーワード5個と活用法
4. 月別重点テーマ（簡潔に）
5. 4週間分の週間投稿計画（曜日別テーマ・キーワード・CTA付き）

抽象論禁止。すぐ実行できる具体的内容のみ。`,
      },
    ],
    onProgress
  );

  return `# ⑥ GBP投稿戦略レポート

実行日時: ${now()}
地域: ${area} | サービス: ${service}

---

## 戦略分析・提言

${results[0]}`;
}

// ---------- Task07: キーワードリサーチ高速化 ----------

export async function runTask07KeywordResearch(
  url: string,
  pages: number = 20,
  onProgress?: (step: number, total: number, label: string) => void
): Promise<string> {
  const results = await runPipeline(
    [
      {
        agent: "crawler",
        label: "競合サイトクロール",
        buildPrompt: () => `
競合サイトの上位${pages}ページを取得してください。

対象URL: ${url}

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

優先順位付きテーブル:
| 優先度 | URL | メインKW | 関連KW | 検索Vol目安 | 難易度(1-10) | 上位表示難易度 |
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
競合サイト: ${url} | 分析ページ数: ${pages}

---

## クロール結果

${results[0]}

---

## キーワード分析（優先度付き）

${results[1]}`;
}
