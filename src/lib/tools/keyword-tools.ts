/**
 * keyword-tools.ts - キーワード生成・分類・優先度付けツール
 *
 * 「今すぐ客」向けローカルキーワードの生成と、
 * 競合サイトのページからのキーワード抽出をサポートする。
 */

import type { PageData } from "./fetch-page";

// --------------------------------------------------------
// キーワードカテゴリ定義
// --------------------------------------------------------

export const CATEGORY_LOCAL = "地域意図";
export const CATEGORY_URGENT = "緊急性";
export const CATEGORY_BUY = "購入検討";
export const CATEGORY_TRUST = "信頼確認";
export const CATEGORY_COMPARE = "比較検討";
export const CATEGORY_HOW = "方法・手順";

// キーワード修飾語マスター
export const MODIFIERS: Record<string, string[]> = {
  [CATEGORY_LOCAL]: [
    "{area}",
    "{area}市",
    "{area}区",
    "{area}近く",
    "{area}近隣",
    "{area}周辺",
    "{area}内",
    "{area}エリア",
    "自宅近く",
  ],
  [CATEGORY_URGENT]: [
    "緊急",
    "急ぎ",
    "今すぐ",
    "即日",
    "即時",
    "当日",
    "夜間",
    "深夜",
    "早朝",
    "24時間",
    "365日",
    "突然",
    "急に",
    "至急",
  ],
  [CATEGORY_BUY]: [
    "費用",
    "料金",
    "価格",
    "値段",
    "相場",
    "いくら",
    "見積もり",
    "無料見積もり",
    "安い",
    "格安",
    "低価格",
    "割引",
    "キャンペーン",
    "プラン",
  ],
  [CATEGORY_TRUST]: [
    "評判",
    "口コミ",
    "評価",
    "おすすめ",
    "人気",
    "実績",
    "信頼",
    "安心",
    "丁寧",
    "親切",
    "資格",
    "認定",
    "受賞",
  ],
  [CATEGORY_COMPARE]: [
    "比較",
    "違い",
    "選び方",
    "ランキング",
    "どこ",
    "どこがいい",
    "失敗しない",
    "後悔しない",
  ],
  [CATEGORY_HOW]: [
    "方法",
    "手順",
    "流れ",
    "やり方",
    "進め方",
    "何をすれば",
    "何から",
    "手続き",
  ],
};

// 購入意欲スコア（カテゴリ × 修飾語の組み合わせで決定）
export const INTENT_SCORE: Record<string, number> = {
  [CATEGORY_URGENT]: 10,
  [CATEGORY_BUY]: 9,
  [CATEGORY_LOCAL]: 8,
  [CATEGORY_TRUST]: 7,
  [CATEGORY_COMPARE]: 6,
  [CATEGORY_HOW]: 5,
};

// 競合難易度の目安（サービス × エリア規模で変動）
export const DIFFICULTY_BASE: Record<string, number> = {
  "葬儀": 6,
  "家族葬": 5,
  "直葬": 4,
  "一日葬": 4,
  "火葬": 5,
  "法要": 4,
  "お墓": 5,
  "納骨": 4,
  "散骨": 3,
};

// --------------------------------------------------------
// データ型
// --------------------------------------------------------

/** 単一キーワードのデータ */
export interface Keyword {
  keyword: string;
  category: string;
  service: string;
  area: string;
  intentScore: number; // 購入意欲スコア (1-10)
  difficulty: number; // 競合難易度 (1-10)
  volumeNote: string; // 検索ボリューム目安
  priority: "高" | "中" | "低";
}

/** キーワードの表示用辞書形式 */
export interface KeywordDisplay {
  カテゴリ: string;
  キーワード: string;
  月間検索ボリューム目安: string;
  競合難易度: string;
  購入意欲スコア: string;
  優先度: string;
}

/** Keywordを表示用辞書に変換する */
export function keywordToDisplay(kw: Keyword): KeywordDisplay {
  return {
    カテゴリ: kw.category,
    キーワード: kw.keyword,
    月間検索ボリューム目安: kw.volumeNote,
    競合難易度: `${kw.difficulty}/10`,
    購入意欲スコア: `${kw.intentScore}/10`,
    優先度: kw.priority,
  };
}

// --------------------------------------------------------
// キーワードジェネレーター
// --------------------------------------------------------

/**
 * ローカルビジネス向けの「今すぐ客」キーワードを生成する
 */
export class LocalKeywordGenerator {
  private service: string;
  private area: string;
  private baseDifficulty: number;

  constructor(service: string, area: string) {
    this.service = service;
    this.area = area;
    this.baseDifficulty = DIFFICULTY_BASE[service] ?? 5;
  }

  /**
   * 指定数のキーワードを生成して返す
   */
  generate(count: number = 20): Keyword[] {
    const keywords: Keyword[] = [];
    const seen = new Set<string>();

    // 全カテゴリ × 修飾語でキーワードを生成
    for (const [category, modifiers] of Object.entries(MODIFIERS)) {
      for (const modifier of modifiers) {
        const mod = modifier.replace("{area}", this.area);

        // 基本パターン: サービス + 修飾語
        const kw1 = `${this.service} ${mod}`;
        const kw2 = `${mod} ${this.service}`;

        for (const kw of [kw1, kw2]) {
          if (!seen.has(kw)) {
            seen.add(kw);
            const kwObj = this.buildKeyword(kw, category);
            keywords.push(kwObj);
          }
        }
      }
    }

    // 複合キーワードを追加
    keywords.push(...this.generateCompoundKeywords());

    // 優先度スコアでソート（intentScore 降順 → difficulty 昇順）
    keywords.sort((a, b) => {
      if (a.intentScore !== b.intentScore) {
        return b.intentScore - a.intentScore;
      }
      return a.difficulty - b.difficulty;
    });

    // 重複除去して指定数を返す
    const unique: Keyword[] = [];
    const seenKw = new Set<string>();
    for (const kw of keywords) {
      if (!seenKw.has(kw.keyword)) {
        seenKw.add(kw.keyword);
        unique.push(kw);
        if (unique.length >= count) {
          break;
        }
      }
    }

    return unique;
  }

  private buildKeyword(keyword: string, category: string): Keyword {
    const intent = INTENT_SCORE[category] ?? 5;
    const difficulty = this.estimateDifficulty(keyword);
    const priority = this.determinePriority(intent, difficulty);
    return {
      keyword,
      category,
      service: this.service,
      area: this.area,
      intentScore: intent,
      difficulty,
      volumeNote: "要GSC確認",
      priority,
    };
  }

  /** キーワードから競合難易度を推定 */
  private estimateDifficulty(keyword: string): number {
    let score = this.baseDifficulty;

    // エリア指定があると難易度下がる
    if (keyword.includes(this.area)) {
      score -= 1;
    }

    // 緊急系は競合少ない
    const urgentWords = [
      "緊急",
      "今すぐ",
      "夜間",
      "深夜",
      "早朝",
      "突然",
    ];
    if (urgentWords.some((w) => keyword.includes(w))) {
      score -= 2;
    }

    // 比較系は難易度高め
    const compareWords = ["ランキング", "比較", "おすすめ", "人気"];
    if (compareWords.some((w) => keyword.includes(w))) {
      score += 1;
    }

    return Math.max(1, Math.min(10, score));
  }

  private determinePriority(
    intent: number,
    difficulty: number,
  ): "高" | "中" | "低" {
    if (intent >= 8 && difficulty <= 5) {
      return "高";
    } else if (intent >= 7 || difficulty <= 4) {
      return "高";
    } else if (intent >= 6 && difficulty <= 7) {
      return "中";
    } else {
      return "低";
    }
  }

  /** 複合キーワード（地域 × 緊急 × サービス）を生成 */
  private generateCompoundKeywords(): Keyword[] {
    const compounds: Keyword[] = [];
    const { area, service } = this;

    const highIntentPatterns = [
      `${area} ${service} 24時間`,
      `${area} ${service} 今すぐ`,
      `${area} ${service} 緊急 料金`,
      `${area} ${service} 費用 安い`,
      `${area} ${service} 即日 見積もり`,
      `${area} ${service} 夜間対応`,
      `${area} ${service} 評判 口コミ`,
      `${area} ${service} 安心 丁寧`,
      `${area} ${service} どこがいい`,
      `${area} 近く ${service}`,
    ];

    for (const kw of highIntentPatterns) {
      const difficulty = this.estimateDifficulty(kw);
      compounds.push({
        keyword: kw,
        category: CATEGORY_LOCAL,
        service,
        area,
        intentScore: 10,
        difficulty,
        volumeNote: "要GSC確認",
        priority: "高",
      });
    }

    return compounds;
  }
}

// --------------------------------------------------------
// テキストからキーワード抽出
// --------------------------------------------------------

/**
 * Webページのタイトル・H1・H2からSEOキーワードを推定する
 */
export class KeywordExtractor {
  // 不要語フィルター
  private static readonly STOP_WORDS = new Set([
    "の",
    "に",
    "は",
    "を",
    "が",
    "と",
    "で",
    "から",
    "まで",
    "について",
    "こと",
    "もの",
    "ため",
    "する",
    "できる",
    "です",
    "ます",
    "ない",
    "ある",
    "いる",
    "TOP",
    "トップ",
    "ページ",
    "サイト",
    "ホーム",
  ]);

  /**
   * PageData オブジェクトからキーワード候補を抽出
   */
  extractFromPage(pageData: PageData): string[] {
    const candidates = new Set<string>();

    const sources: string[] = [
      pageData.title,
      pageData.h1,
      pageData.metaDescription,
      ...pageData.h2List,
      ...pageData.h3List,
    ];

    for (const text of sources) {
      if (!text) continue;
      const words = this.tokenize(text);
      for (const w of words) {
        candidates.add(w);
      }
    }

    return Array.from(candidates).filter((w) => w.length >= 2);
  }

  /**
   * 簡易トークナイズ（記号除去 + ストップワードフィルター）
   * 本格的な形態素解析が必要な場合は mecab/sudachi を追加する
   */
  private tokenize(text: string): string[] {
    // 記号・数字のみ除去
    text = text.replace(
      /[「」『』【】〔〕()（）!！?？.,、。・\-\s]+/g,
      " ",
    );
    const tokens = text
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t);
    const filtered: string[] = [];

    for (const t of tokens) {
      if (KeywordExtractor.STOP_WORDS.has(t)) continue;
      if (t.length < 2) continue;
      if (/^\d+$/.test(t)) continue;
      filtered.push(t);
    }

    return filtered;
  }

  /** タイトルとH1からメインキーワードを推定 */
  inferMainKeyword(title: string, h1: string): string {
    // タイトルの区切り文字前後でメインKWを判定
    for (const sep of ["|", "｜", "-", "–", "—", "：", ":"]) {
      if (title.includes(sep)) {
        const parts = title.split(sep);
        return parts[0].trim();
      }
    }
    // H1が短ければH1を採用
    if (h1 && h1.length <= 20) {
      return h1;
    }
    return title.slice(0, 20).trim();
  }
}

// --------------------------------------------------------
// CSV出力ユーティリティ
// --------------------------------------------------------

/** キーワードリストをCSV文字列に変換 */
export function keywordsToCsv(keywords: Keyword[]): string {
  if (keywords.length === 0) return "";

  const headers = [
    "カテゴリ",
    "キーワード",
    "月間検索ボリューム目安",
    "競合難易度",
    "購入意欲スコア",
    "優先度",
  ];

  const lines: string[] = [headers.join(",")];

  for (const kw of keywords) {
    const d = keywordToDisplay(kw);
    lines.push(
      [
        d.カテゴリ,
        d.キーワード,
        d.月間検索ボリューム目安,
        d.競合難易度,
        d.購入意欲スコア,
        d.優先度,
      ]
        .map((v) => `"${v}"`)
        .join(","),
    );
  }

  return lines.join("\n");
}

/** カテゴリ別のMarkdownテーブルを生成 */
export function keywordsToMarkdownTable(keywords: Keyword[]): string {
  const byCategory = new Map<string, Keyword[]>();
  for (const kw of keywords) {
    const existing = byCategory.get(kw.category) || [];
    existing.push(kw);
    byCategory.set(kw.category, existing);
  }

  const lines: string[] = [];
  for (const [category, kws] of Array.from(byCategory.entries())) {
    lines.push(`\n## カテゴリ: ${category}キーワード\n`);
    lines.push(
      "| キーワード | 月間検索ボリューム目安 | 競合難易度 | 購入意欲スコア | 優先度 |",
    );
    lines.push("|---|---|---|---|---|");
    for (const kw of kws) {
      const d = keywordToDisplay(kw);
      lines.push(
        `| ${d.キーワード} | ${d.月間検索ボリューム目安} | ${d.競合難易度} | ${d.購入意欲スコア} | ${d.優先度} |`,
      );
    }
  }

  return lines.join("\n");
}
