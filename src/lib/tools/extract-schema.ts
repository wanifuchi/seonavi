/**
 * extract-schema.ts - 構造化データ（JSON-LD / Microdata / RDFa）抽出・監査ツール
 *
 * WebページのHTMLソースからすべての構造化データを抽出し、
 * 不足Schemaの優先度付けと改善用JSON-LDを生成する。
 */

import * as cheerio from "cheerio";

// --------------------------------------------------------
// 評価ラベル
// --------------------------------------------------------

export const EVAL_GOOD = "✅ 良好";
export const EVAL_WARN = "⚠️ 不足あり";
export const EVAL_ERROR = "❌ 重大な問題";

// Schema.org で LocalBusiness に必須とされるプロパティ
export const LOCAL_BUSINESS_REQUIRED = new Set([
  "name",
  "address",
  "telephone",
]);

export const LOCAL_BUSINESS_RECOMMENDED = new Set([
  "openingHours",
  "url",
  "image",
  "priceRange",
  "geo",
  "sameAs",
  "description",
  "areaServed",
]);

// FuneralHome は LocalBusiness の派生型
export const FUNERAL_HOME_TYPES = new Set([
  "FuneralHome",
  "LocalBusiness",
  "Organization",
  "ProfessionalService",
  "HealthAndBeautyBusiness",
]);

// --------------------------------------------------------
// データ型
// --------------------------------------------------------

/** 抽出した単一Schemaのデータ */
export interface SchemaItem {
  schemaType: string;
  source: "json-ld" | "microdata" | "rdfa";
  properties: Record<string, unknown>;
  raw: string;
  evalLabel: string;
  evalNote: string;
}

/** 不足Schema情報 */
export interface MissingSchema {
  type: string;
  reason: string;
}

/** 生成されたJSON-LD */
export interface GeneratedJsonLd {
  priority: string;
  type: string;
  schema: Record<string, unknown>;
}

/** Schema監査の全体結果 */
export interface SchemaAuditResult {
  url: string;
  foundSchemas: SchemaItem[];
  missingHigh: MissingSchema[];
  missingMid: MissingSchema[];
  missingLow: MissingSchema[];
  generatedJsonLd: GeneratedJsonLd[];
  pageInfo: Record<string, string>;
}

// --------------------------------------------------------
// メイン抽出クラス
// --------------------------------------------------------

export class SchemaExtractor {
  private $: cheerio.CheerioAPI;
  readonly url: string;
  readonly domain: string;

  constructor(html: string, url: string = "") {
    this.$ = cheerio.load(html);
    this.url = url;
    try {
      this.domain = new URL(url).hostname;
    } catch {
      this.domain = "";
    }
  }

  /** <script type="application/ld+json"> を全て抽出 */
  extractJsonLd(): SchemaItem[] {
    const items: SchemaItem[] = [];

    this.$('script[type="application/ld+json"]').each((_, el) => {
      const raw = (this.$(el).html() || "").trim();
      if (!raw) return;

      try {
        const data = JSON.parse(raw);
        // @graph 形式の場合は展開
        if (data["@graph"]) {
          for (const node of data["@graph"]) {
            items.push(this.buildSchemaItem(node, raw, "json-ld"));
          }
        } else {
          items.push(this.buildSchemaItem(data, raw, "json-ld"));
        }
      } catch (e) {
        items.push({
          schemaType: "(JSON解析エラー)",
          source: "json-ld",
          properties: {},
          raw: raw.slice(0, 200),
          evalLabel: EVAL_ERROR,
          evalNote: `JSONパースエラー: ${e}`,
        });
      }
    });

    return items;
  }

  private buildSchemaItem(
    data: Record<string, unknown>,
    raw: string,
    source: "json-ld" | "microdata" | "rdfa",
  ): SchemaItem {
    let schemaType = data["@type"] as string | string[] | undefined;
    if (Array.isArray(schemaType)) {
      schemaType = schemaType.join(" / ");
    }
    schemaType = schemaType || "不明";

    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!k.startsWith("@")) {
        props[k] = v;
      }
    }

    const [evalLabel, evalNote] = this.evaluateSchema(schemaType, props);

    return {
      schemaType,
      source,
      properties: props,
      raw: raw.slice(0, 500),
      evalLabel,
      evalNote,
    };
  }

  /** Schemaの完全性を評価 */
  private evaluateSchema(
    schemaType: string,
    props: Record<string, unknown>,
  ): [string, string] {
    const propKeys = new Set(Object.keys(props));

    if (
      FUNERAL_HOME_TYPES.has(schemaType) ||
      schemaType.includes("Business")
    ) {
      const missing = Array.from(LOCAL_BUSINESS_REQUIRED).filter(
        (k) => !propKeys.has(k),
      );
      if (missing.length === 0) {
        const recMissing = Array.from(LOCAL_BUSINESS_RECOMMENDED).filter(
          (k) => !propKeys.has(k),
        );
        if (recMissing.length === 0) {
          return [EVAL_GOOD, "必須・推奨プロパティすべて揃っています"];
        }
        return [
          EVAL_WARN,
          `推奨プロパティ不足: ${recMissing.sort().join(", ")}`,
        ];
      }
      return [
        EVAL_WARN,
        `必須プロパティ不足: ${missing.sort().join(", ")}`,
      ];
    }

    if (schemaType === "BreadcrumbList") {
      if (props["itemListElement"] && (props["itemListElement"] as unknown[]).length > 0) {
        return [EVAL_GOOD, ""];
      }
      return [EVAL_WARN, "itemListElement が空または未設定"];
    }

    if (schemaType === "FAQPage") {
      const items = props["mainEntity"] as unknown[] | undefined;
      if (items && items.length >= 3) {
        return [EVAL_GOOD, `FAQ ${items.length} 件`];
      }
      return [
        EVAL_WARN,
        `FAQ件数が少ない（${items ? items.length : 0}件）`,
      ];
    }

    if (Object.keys(props).length === 0) {
      return [EVAL_ERROR, "プロパティが空です"];
    }
    return [EVAL_GOOD, `${Object.keys(props).length}個のプロパティ`];
  }

  /** Microdata（itemscope/itemtype）を抽出 */
  extractMicrodata(): SchemaItem[] {
    const items: SchemaItem[] = [];

    this.$("[itemscope]").each((_, el) => {
      const itemtype = this.$(el).attr("itemtype") || "";
      const schemaType = itemtype
        ? itemtype.split("/").pop() || "不明"
        : "不明";
      const props: Record<string, unknown> = {};

      this.$(el)
        .find("[itemprop]")
        .each((_, propEl) => {
          const name = this.$(propEl).attr("itemprop") || "";
          const value =
            this.$(propEl).attr("content") ||
            this.$(propEl).attr("href") ||
            this.$(propEl).attr("src") ||
            this.$(propEl).text().trim().slice(0, 100);
          if (name) {
            props[name] = value;
          }
        });

      const [evalLabel, evalNote] = this.evaluateSchema(schemaType, props);
      items.push({
        schemaType,
        source: "microdata",
        properties: props,
        raw: "",
        evalLabel,
        evalNote,
      });
    });

    return items;
  }

  /** RDFa（vocab/typeof）を抽出 */
  extractRdfa(): SchemaItem[] {
    const items: SchemaItem[] = [];

    this.$("[typeof]").each((_, el) => {
      const schemaType = this.$(el).attr("typeof") || "不明";
      const props: Record<string, unknown> = {};

      this.$(el)
        .find("[property]")
        .each((_, propEl) => {
          const rawName = this.$(propEl).attr("property") || "";
          const name = rawName.split(":").pop() || "";
          const value =
            this.$(propEl).attr("content") ||
            this.$(propEl).text().trim().slice(0, 100);
          if (name) {
            props[name] = value;
          }
        });

      const [evalLabel, evalNote] = this.evaluateSchema(schemaType, props);
      items.push({
        schemaType,
        source: "rdfa",
        properties: props,
        raw: "",
        evalLabel,
        evalNote,
      });
    });

    return items;
  }

  /** ページからビジネス情報を抽出（JSON-LD生成に使用） */
  extractPageInfo(): Record<string, string> {
    const info: Record<string, string> = {};

    // タイトル
    const title = this.$("title");
    info["title"] = title.length ? title.text().trim() : "";

    // 電話番号（パターンマッチ）
    const text = this.$.text();
    const phones = text.match(
      /(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{4}|\+81[-\s]?\d+[-\s]?\d+[-\s]?\d+)/g,
    );
    info["telephone"] = phones ? phones[0] : "";

    // 郵便番号
    const postal = text.match(/〒\s*\d{3}[-\s]?\d{4}/g);
    info["postal_code"] = postal
      ? postal[0].replace("〒", "").trim()
      : "";

    // 住所（都道府県から）
    const addressMatch = text.match(
      /(東京都|大阪府|京都府|北海道|[\u4e00-\u9fff]{2,3}(?:県|都|府|道)).{2,50}(?:丁目|番地|号|ビル|棟)/,
    );
    info["address"] = addressMatch ? addressMatch[0] : "";

    // 営業時間
    const hours = text.match(/\d{1,2}:\d{2}\s*[〜~\-]\s*\d{1,2}:\d{2}/g);
    info["opening_hours"] = hours ? hours[0] : "";

    // URL
    info["url"] = this.url;

    // ドメイン
    info["domain"] = this.domain;

    return info;
  }
}

// --------------------------------------------------------
// 監査エンジン
// --------------------------------------------------------

export class SchemaAuditor {
  private extractor: SchemaExtractor;

  constructor(extractor: SchemaExtractor) {
    this.extractor = extractor;
  }

  audit(): SchemaAuditResult {
    const result: SchemaAuditResult = {
      url: this.extractor.url,
      foundSchemas: [],
      missingHigh: [],
      missingMid: [],
      missingLow: [],
      generatedJsonLd: [],
      pageInfo: {},
    };

    // 全Schema抽出
    result.foundSchemas = [
      ...this.extractor.extractJsonLd(),
      ...this.extractor.extractMicrodata(),
      ...this.extractor.extractRdfa(),
    ];

    // ページ情報収集
    result.pageInfo = this.extractor.extractPageInfo();

    // 存在するSchemaタイプのセット
    const foundTypes = new Set(result.foundSchemas.map((s) => s.schemaType));

    // 不足Schemaを判定
    this.checkMissingSchemas(result, foundTypes);

    // 優先度「高」のJSON-LDを生成
    this.generateJsonLd(result, foundTypes);

    return result;
  }

  /** 不足Schemaをリストアップして優先度付け */
  private checkMissingSchemas(
    result: SchemaAuditResult,
    foundTypes: Set<string>,
  ): void {
    const pageText = this.extractor["$"].text();

    // ===== 優先度「高」 =====
    const hasLocalBusiness = Array.from(FUNERAL_HOME_TYPES).some((t) =>
      foundTypes.has(t),
    );
    if (!hasLocalBusiness) {
      result.missingHigh.push({
        type: "LocalBusiness / FuneralHome",
        reason:
          "ローカルSEOの最重要Schema。Googleマップ表示に直結。",
      });
    }

    if (!foundTypes.has("BreadcrumbList")) {
      result.missingHigh.push({
        type: "BreadcrumbList",
        reason:
          "パンくずリッチスニペット。検索結果のURLをパス表示に変換してCTR向上。",
      });
    }

    // FAQコンテンツがあるかチェック
    const faqIndicators = ["よくある質問", "FAQ", "Q&A", "Q.", "A."];
    const hasFaqContent = faqIndicators.some((ind) =>
      pageText.includes(ind),
    );
    if (hasFaqContent && !foundTypes.has("FAQPage")) {
      result.missingHigh.push({
        type: "FAQPage",
        reason:
          "FAQコンテンツが存在するがSchemaなし。FAQ形式のリッチスニペットが取得可能。",
      });
    }

    // ===== 優先度「中」 =====
    const reviewIndicators = [
      "口コミ",
      "レビュー",
      "評価",
      "評判",
      "星",
      "★",
    ];
    const hasReview = reviewIndicators.some((ind) =>
      pageText.includes(ind),
    );
    if (hasReview && !foundTypes.has("AggregateRating")) {
      result.missingMid.push({
        type: "AggregateRating",
        reason:
          "口コミ・評価コンテンツがあるがSchema未実装。星評価スニペット取得可能。",
      });
    }

    if (!foundTypes.has("Service")) {
      result.missingMid.push({
        type: "Service",
        reason:
          "提供サービスをSchema化することでリッチスニペット取得の可能性。",
      });
    }

    if (!foundTypes.has("WebSite")) {
      result.missingMid.push({
        type: "WebSite",
        reason:
          "サイト検索ボックス（SiteLinksSearchBox）の有効化に必要。",
      });
    }

    // ===== 優先度「低」 =====
    if (!foundTypes.has("ImageObject")) {
      result.missingLow.push({
        type: "ImageObject",
        reason:
          "画像のSEO強化。Googleの画像検索での表示改善。",
      });
    }
  }

  /** 優先度「高」のJSON-LDを生成 */
  private generateJsonLd(
    result: SchemaAuditResult,
    foundTypes: Set<string>,
  ): void {
    const info = result.pageInfo;

    // LocalBusiness / FuneralHome
    const hasLb = Array.from(FUNERAL_HOME_TYPES).some((t) => foundTypes.has(t));
    if (
      !hasLb ||
      result.foundSchemas.some(
        (s) =>
          FUNERAL_HOME_TYPES.has(s.schemaType) &&
          s.evalLabel === EVAL_WARN,
      )
    ) {
      const lbSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "FuneralHome",
        name:
          (info["title"] || "").split("|")[0].trim() ||
          "（サイトタイトルから取得）",
        url: info["url"] || "",
        telephone: info["telephone"] || "（電話番号を入力）",
        address: {
          "@type": "PostalAddress",
          streetAddress: info["address"] || "（住所を入力）",
          postalCode: info["postal_code"] || "（郵便番号を入力）",
          addressRegion: "（都道府県を入力）",
          addressCountry: "JP",
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            opens: "00:00",
            closes: "23:59",
          },
        ],
        priceRange: "¥¥",
        image: `${info["url"] || ""}（OGP画像URLを入力）`,
        description: "（メタディスクリプションを入力）",
        sameAs: [
          "（GoogleビジネスプロフィールURLを入力）",
          "（FacebookページURLを入力）",
        ],
      };
      result.generatedJsonLd.push({
        priority: "高",
        type: "FuneralHome（LocalBusiness派生）",
        schema: lbSchema,
      });
    }

    // BreadcrumbList
    if (!foundTypes.has("BreadcrumbList")) {
      const bcSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ホーム",
            item: (info["url"] || "").replace(/\/$/, "") + "/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "（現在のページ名を入力）",
            item:
              (info["url"] || "") + "（現在のページURLを入力）",
          },
        ],
      };
      result.generatedJsonLd.push({
        priority: "高",
        type: "BreadcrumbList",
        schema: bcSchema,
      });
    }

    // FAQPage
    const pageText = this.extractor["$"].text();
    const faqIndicators = ["よくある質問", "FAQ", "Q&A"];
    const hasFaqContent = faqIndicators.some((ind) =>
      pageText.includes(ind),
    );
    if (hasFaqContent && !foundTypes.has("FAQPage")) {
      const faqSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "（FAQの質問1を入力）",
            acceptedAnswer: {
              "@type": "Answer",
              text: "（FAQの回答1を入力）",
            },
          },
          {
            "@type": "Question",
            name: "（FAQの質問2を入力）",
            acceptedAnswer: {
              "@type": "Answer",
              text: "（FAQの回答2を入力）",
            },
          },
        ],
      };
      result.generatedJsonLd.push({
        priority: "高",
        type: "FAQPage",
        schema: faqSchema,
      });
    }
  }
}

// --------------------------------------------------------
// レポート生成
// --------------------------------------------------------

/** 監査結果をMarkdownレポートに整形 */
export function formatAuditReport(result: SchemaAuditResult): string {
  const lines: string[] = [
    "# 構造化データ（Schema）監査レポート",
    "",
    `**対象URL:** ${result.url}`,
    "",
    "---",
    "",
    "## 既存Schema一覧",
    "",
  ];

  if (result.foundSchemas.length > 0) {
    lines.push(
      "| Schema種別 | ソース | 主要プロパティ | 評価 | 備考 |",
    );
    lines.push("|---|---|---|---|---|");
    for (const s of result.foundSchemas) {
      const propsStr = Object.keys(s.properties).slice(0, 6).join(", ");
      lines.push(
        `| ${s.schemaType} | ${s.source} | ${propsStr} | ${s.evalLabel} | ${s.evalNote} |`,
      );
    }
  } else {
    lines.push("**構造化データは検出されませんでした。**");
  }

  lines.push(
    "",
    "---",
    "",
    "## 不足・弱いSchema（優先度付き）",
    "",
    "| 優先度 | Schema種別 | 理由 |",
    "|---|---|---|",
  );

  for (const item of result.missingHigh) {
    lines.push(`| **高** | ${item.type} | ${item.reason} |`);
  }
  for (const item of result.missingMid) {
    lines.push(`| 中 | ${item.type} | ${item.reason} |`);
  }
  for (const item of result.missingLow) {
    lines.push(`| 低 | ${item.type} | ${item.reason} |`);
  }

  if (
    result.missingHigh.length === 0 &&
    result.missingMid.length === 0 &&
    result.missingLow.length === 0
  ) {
    lines.push("| - | なし | 主要Schemaは実装済みです |");
  }

  lines.push(
    "",
    "---",
    "",
    '## 優先度「高」のJSON-LD（実装用）',
    "",
  );

  for (const item of result.generatedJsonLd) {
    lines.push(`### ${item.type}`);
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(item.schema, null, 2));
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}
