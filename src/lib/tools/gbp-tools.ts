/**
 * gbp-tools.ts - Googleビジネスプロフィール（GBP）投稿分析・生成ツール
 *
 * 競合のGBP投稿を分析し、最適化された投稿文を生成する。
 */

// --------------------------------------------------------
// GBP投稿タイプ
// --------------------------------------------------------

export const POST_TYPE_NEWS = "お知らせ";
export const POST_TYPE_EVENT = "イベント";
export const POST_TYPE_OFFER = "特典";

// 曜日ごとの推奨投稿タイプ
export const WEEKDAY_STRATEGY: Record<
  number,
  [string, string]
> = {
  0: [POST_TYPE_NEWS, "実績・お知らせ"], // 月
  1: [POST_TYPE_NEWS, "お役立ち情報"], // 火
  2: [POST_TYPE_EVENT, "相談会・無料見積もり"], // 水
  3: [POST_TYPE_EVENT, "季節・時事情報"], // 木
  4: [POST_TYPE_NEWS, "お客様の声"], // 金
  5: [POST_TYPE_OFFER, "特典・キャンペーン"], // 土
  6: [POST_TYPE_NEWS, "地域情報"], // 日
};

// 月別テーマ
export const MONTHLY_THEMES: Record<number, string> = {
  1: "年始・新年の挨拶、お正月の法要案内",
  2: "節分、冬の法要シーズン案内",
  3: "春彼岸、春のお墓参りキャンペーン",
  4: "春の季節、年度替わりの各種手続き案内",
  5: "ゴールデンウィーク対応案内、初夏の法要",
  6: "梅雨季節の注意点、父の日関連",
  7: "お盆の案内（早めの告知）、夏の法要",
  8: "お盆シーズン最盛期、夏期対応案内",
  9: "秋彼岸、秋のお墓参り",
  10: "秋の法要シーズン、忌日法要案内",
  11: "年末に向けた各種手続き案内",
  12: "年末年始の営業案内、感謝のご挨拶",
};

// CTAパターン
export const CTA_PATTERNS: Record<string, string> = {
  "電話": "今すぐお電話ください。{phone}",
  "無料相談": "無料相談受付中。お気軽にご連絡ください。",
  "LINE": "LINEでもご相談いただけます。",
  "24時間": "24時間365日、いつでもご連絡ください。",
  "見積もり": "無料お見積もり承ります。お気軽にどうぞ。",
};

// --------------------------------------------------------
// データ型
// --------------------------------------------------------

/** GBP投稿データ */
export interface GBPPost {
  postNo: number;
  postType: string;
  theme: string;
  body: string;
  cta: string;
  keywords: string[];
  area: string;
  landmark: string;
  recommendedDay: string;
  charCount: number;
}

/** GBP投稿をMarkdown形式に変換 */
export function gbpPostToMarkdown(post: GBPPost): string {
  return `---
【投稿 No.${post.postNo}】
タイプ: ${post.postType}
テーマ: ${post.theme}
推奨投稿曜日: ${post.recommendedDay}
本文（${post.charCount}文字）:

${post.body}

CTA: ${post.cta}
使用KW: ${post.keywords.join(", ")}
---`;
}

/** 競合GBP投稿の分析結果 */
export interface GBPAnalysis {
  url: string;
  postTypes: string[];
  postFrequency: string; // 「週1回」「月2〜3回」など
  themes: string[];
  ctaPatterns: string[];
  usesImages: boolean;
  usesVideo: boolean;
  topKeywords: string[];
  keywordGaps: string[]; // 競合が使っていないKW
}

// --------------------------------------------------------
// 投稿テンプレート型
// --------------------------------------------------------

interface PostTemplate {
  type: string;
  theme: string;
  body: string;
  cta: string;
  keywords: string[];
}

// --------------------------------------------------------
// GBP投稿ジェネレーター
// --------------------------------------------------------

/**
 * 地域・サービス・競合分析をもとにGBP投稿文を生成する
 */
export class GBPPostGenerator {
  private service: string;
  private area: string;
  private landmarks: string[];
  private month: number;

  constructor(
    service: string,
    area: string,
    landmarks: string[] = [],
  ) {
    this.service = service;
    this.area = area;
    this.landmarks = landmarks;
    this.month = new Date().getMonth() + 1; // JavaScript は 0-indexed
  }

  /**
   * 10本のGBP投稿を生成する
   */
  generate10Posts(
    competitorKeywords: string[] = [],
    phone: string = "（電話番号）",
  ): GBPPost[] {
    const competitorKws = new Set(competitorKeywords);
    const posts: GBPPost[] = [];

    const templates = this.getPostTemplates(phone);

    const weekdayNames = [
      "月曜",
      "火曜",
      "水曜",
      "木曜",
      "金曜",
      "土曜",
      "日曜",
    ];

    for (let i = 0; i < Math.min(templates.length, 10); i++) {
      const template = templates[i];

      // 競合が使っていないKWを優先
      let kws = template.keywords.filter(
        (kw) => !competitorKws.has(kw),
      );
      if (kws.length === 0) {
        kws = template.keywords;
      }

      // ランドマークを投稿に組み込む
      const landmark =
        this.landmarks.length > 0
          ? this.landmarks[(i + 1) % this.landmarks.length]
          : "";
      let body = template.body;
      if (landmark && !body.includes(landmark)) {
        body = body.replace("{landmark}", landmark);
      } else {
        body = body.replace("{landmark}", this.area);
      }

      body = body.replace(/{area}/g, this.area);
      body = body.replace(/{service}/g, this.service);
      body = body.replace(/{month}/g, `${this.month}月`);

      const weekdayNum = i % 7;

      const post: GBPPost = {
        postNo: i + 1,
        postType: template.type,
        theme: template.theme,
        body,
        cta: template.cta,
        keywords: kws,
        area: this.area,
        landmark,
        recommendedDay: weekdayNames[weekdayNum],
        charCount: body.length,
      };
      posts.push(post);
    }

    return posts;
  }

  /** 投稿テンプレート10本を返す */
  private getPostTemplates(phone: string): PostTemplate[] {
    return [
      // 1. 緊急対応訴求
      {
        type: POST_TYPE_NEWS,
        theme: `${this.area}の${this.service} 24時間対応`,
        body:
          `突然のご不幸でも、${this.area}エリアのご家族を24時間365日サポートします。` +
          `{landmark}周辺にお住まいの方もすぐに対応可能です。` +
          `深夜・早朝でもご遠慮なくご連絡ください。`,
        cta: `今すぐお電話ください。${phone}`,
        keywords: [
          `${this.area} ${this.service} 24時間`,
          `${this.area} ${this.service} 緊急`,
        ],
      },
      // 2. 費用・料金訴求
      {
        type: POST_TYPE_NEWS,
        theme: `${this.service}の費用・料金について`,
        body:
          `${this.area}での${this.service}費用について、` +
          `わかりやすくご説明しています。` +
          `{landmark}近くにお住まいの方も、` +
          `まずは無料でお見積もりいたします。追加費用なし・明朗会計を徹底しています。`,
        cta: "無料お見積もりはこちら。",
        keywords: [
          `${this.area} ${this.service} 費用`,
          `${this.area} ${this.service} 料金`,
        ],
      },
      // 3. 家族葬・小規模訴求
      {
        type: POST_TYPE_NEWS,
        theme: "家族だけで送る、静かなお別れ",
        body:
          `${this.area}での家族葬・直葬のご相談、増えています。` +
          `{landmark}周辺でも対応エリア内です。` +
          `ご家族だけでゆっくりお別れできる${this.month}月のプランをご用意しています。`,
        cta: "今すぐお電話ください。",
        keywords: [
          `${this.area} 家族葬`,
          `${this.area} 直葬`,
        ],
      },
      // 4. 無料相談訴求
      {
        type: POST_TYPE_EVENT,
        theme: "無料相談会",
        body:
          `【無料相談受付中】` +
          `${this.area}の{landmark}近くにある当社では、` +
          `事前の${this.service}相談を無料で承っています。` +
          `「いざという時に備えて知っておきたい」方のご相談をお待ちしています。`,
        cta: "LINEでもご相談いただけます。",
        keywords: [
          `${this.area} ${this.service} 相談`,
          `${this.area} ${this.service} 無料`,
        ],
      },
      // 5. 月別テーマ
      {
        type: POST_TYPE_NEWS,
        theme: `${this.month}月の${this.service}案内`,
        body:
          `${this.month}月は${MONTHLY_THEMES[this.month] || "法要・お別れ"}の季節です。` +
          `${this.area}・{landmark}周辺でのご依頼も` +
          `迅速に対応いたします。` +
          `ご不明な点はお気軽にお問い合わせください。`,
        cta: "24時間365日、いつでもご連絡ください。",
        keywords: [
          `${this.area} ${this.service} ${this.month}月`,
          "法要",
        ],
      },
      // 6. 実績訴求
      {
        type: POST_TYPE_NEWS,
        theme: "地域密着の実績",
        body:
          `創業以来、${this.area}・{landmark}エリアを中心に` +
          `多くのご家族の大切なお別れをサポートしてきました。` +
          `地域の皆様に選ばれ続ける理由は、` +
          `真摯な対応と明朗な料金体系です。`,
        cta: "今すぐお電話ください。",
        keywords: [
          `${this.area} ${this.service} 評判`,
          `${this.area} ${this.service} 実績`,
        ],
      },
      // 7. 口コミ・安心訴求
      {
        type: POST_TYPE_NEWS,
        theme: "ご利用者様の声",
        body:
          `【${this.area}のご利用者様より】` +
          `「突然のことで不安でしたが、` +
          `{landmark}の近くから駆けつけてくれて助かりました。` +
          `丁寧な説明と温かい対応に感謝しています。」` +
          `ご家族のご不安を、私たちが全力でサポートします。`,
        cta: "無料相談受付中。お気軽にご連絡ください。",
        keywords: [
          `${this.area} ${this.service} 口コミ`,
          `${this.area} ${this.service} 安心`,
        ],
      },
      // 8. 即日対応訴求
      {
        type: POST_TYPE_NEWS,
        theme: "即日・当日対応可能",
        body:
          `${this.area}{landmark}周辺で、` +
          `当日・即日の${this.service}対応が必要な方へ。` +
          `ご連絡から最短でお伺いします。` +
          `深夜・早朝・年末年始も24時間対応しています。`,
        cta: "今すぐお電話ください。",
        keywords: [
          `${this.area} ${this.service} 即日`,
          `${this.area} ${this.service} 当日`,
        ],
      },
      // 9. 特典・キャンペーン
      {
        type: POST_TYPE_OFFER,
        theme: "事前相談特典",
        body:
          `【${this.area}限定】事前相談をいただいたご家族に` +
          `特典をご用意しています。` +
          `{landmark}周辺のご家族も対象です。` +
          `いざという時に慌てないために、` +
          `今のうちにご相談ください。`,
        cta: "LINEでもご相談いただけます。",
        keywords: [
          `${this.area} ${this.service} 事前相談`,
          "特典",
        ],
      },
      // 10. 選び方・比較訴求
      {
        type: POST_TYPE_NEWS,
        theme: `${this.service}会社の選び方`,
        body:
          `${this.area}で${this.service}社を選ぶ際のポイントをお伝えします。` +
          `①24時間対応できるか` +
          `②料金が明確か` +
          `③{landmark}など地域に精通しているか。` +
          `当社はすべての点でご安心いただけます。`,
        cta: "無料相談受付中。お気軽にご連絡ください。",
        keywords: [
          `${this.area} ${this.service} 選び方`,
          `${this.area} ${this.service} どこがいい`,
        ],
      },
    ];
  }
}

// --------------------------------------------------------
// 週間投稿計画ジェネレーター
// --------------------------------------------------------

/** 週間・月間の投稿計画を生成する */
export class WeeklyPlanGenerator {
  private service: string;
  private area: string;

  constructor(service: string, area: string) {
    this.service = service;
    this.area = area;
  }

  /** 4週間分の投稿計画をMarkdownテーブルで返す */
  generateWeeklyPlan(): string {
    const lines: string[] = [
      "## 週間投稿計画（4週間）",
      "",
      "| 週 | 曜日 | 投稿タイプ | テーマ | 使用キーワード | CTAの書き方 |",
      "|---|---|---|---|---|---|",
    ];

    type WeekDay = [string, string, string, string, string];

    const weeklyThemes: WeekDay[][] = [
      // 1週目
      [
        ["月", POST_TYPE_NEWS, "24時間緊急対応", `${this.area} ${this.service} 24時間`, "今すぐお電話ください"],
        ["火", POST_TYPE_NEWS, "費用・料金案内", `${this.area} ${this.service} 費用`, "無料お見積もりはこちら"],
        ["水", POST_TYPE_EVENT, "無料相談会", `${this.area} ${this.service} 相談`, "LINEでもご相談いただけます"],
        ["木", POST_TYPE_NEWS, "季節の法要案内", `${this.area} 法要`, "24時間受付中"],
        ["金", POST_TYPE_NEWS, "お客様の声", `${this.area} ${this.service} 口コミ`, "お気軽にご相談ください"],
        ["土", POST_TYPE_OFFER, "事前相談特典", `${this.area} ${this.service} 事前相談`, "LINEでもご相談いただけます"],
        ["日", POST_TYPE_NEWS, "地域情報・MAP", `${this.area} ${this.service} 近く`, "今すぐお電話ください"],
      ],
      // 2週目
      [
        ["月", POST_TYPE_NEWS, "実績・件数報告", `${this.area} ${this.service} 実績`, "今すぐお電話ください"],
        ["火", POST_TYPE_NEWS, "家族葬の流れ", `${this.area} 家族葬 流れ`, "無料相談受付中"],
        ["水", POST_TYPE_EVENT, "見学・内覧案内", `${this.area} ${this.service} 見学`, "LINEでもご相談いただけます"],
        ["木", POST_TYPE_NEWS, "当日対応事例", `${this.area} ${this.service} 当日`, "24時間365日対応"],
        ["金", POST_TYPE_NEWS, "スタッフ紹介", `${this.area} ${this.service} 安心`, "お気軽にご相談ください"],
        ["土", POST_TYPE_OFFER, "料金プラン紹介", `${this.area} ${this.service} 料金 安い`, "無料お見積もりはこちら"],
        ["日", POST_TYPE_NEWS, "ランドマーク周辺案内", `${this.area} ${this.service} 周辺`, "今すぐお電話ください"],
      ],
      // 3週目（1週目と変化をつける）
      [
        ["月", POST_TYPE_NEWS, "夜間・深夜対応案内", `${this.area} ${this.service} 夜間`, "今すぐお電話ください"],
        ["火", POST_TYPE_NEWS, "直葬・火葬の案内", `${this.area} 直葬`, "無料相談受付中"],
        ["水", POST_TYPE_EVENT, "無料電話相談", `${this.area} ${this.service} 無料`, "LINEでもご相談いただけます"],
        ["木", POST_TYPE_NEWS, "月別テーマ投稿", `${this.area} ${this.service} ${new Date().getMonth() + 1}月`, "24時間受付中"],
        ["金", POST_TYPE_NEWS, "よくある質問", `${this.area} ${this.service} 費用 内訳`, "お気軽にご相談ください"],
        ["土", POST_TYPE_OFFER, "キャンペーン告知", `${this.area} ${this.service} キャンペーン`, "今すぐお電話ください"],
        ["日", POST_TYPE_NEWS, "選び方ガイド", `${this.area} ${this.service} 選び方`, "無料相談受付中"],
      ],
      // 4週目
      [
        ["月", POST_TYPE_NEWS, "突然の訃報への対応", `${this.area} ${this.service} 急ぎ`, "今すぐお電話ください"],
        ["火", POST_TYPE_NEWS, "法要の種類と費用", `${this.area} 法要 費用`, "無料お見積もりはこちら"],
        ["水", POST_TYPE_EVENT, "月末の相談会", `${this.area} ${this.service} 相談 無料`, "LINEでもご相談いただけます"],
        ["木", POST_TYPE_NEWS, "次月テーマ予告", `${this.area} ${this.service}`, "24時間365日対応"],
        ["金", POST_TYPE_NEWS, "感謝・実績まとめ", `${this.area} ${this.service} 評判`, "お気軽にご相談ください"],
        ["土", POST_TYPE_OFFER, "次月の特典予告", `${this.area} ${this.service} 特典`, "LINEでもご相談いただけます"],
        ["日", POST_TYPE_NEWS, "翌月の法要案内", `${this.area} ${this.service} 予約`, "今すぐお電話ください"],
      ],
    ];

    for (let weekNum = 0; weekNum < weeklyThemes.length; weekNum++) {
      for (const [day, postType, theme, kw, cta] of weeklyThemes[weekNum]) {
        lines.push(
          `| ${weekNum + 1}週目 | ${day} | ${postType} | ${theme} | ${kw} | ${cta} |`,
        );
      }
    }

    return lines.join("\n");
  }

  /** 12ヶ月の投稿テーマカレンダーをMarkdownで返す */
  generateMonthlyCalendar(): string {
    const lines: string[] = [
      "## 月別テーマカレンダー（12ヶ月）",
      "",
      "| 月 | メインテーマ | 投稿キーワード | 特記事項 |",
      "|---|---|---|---|",
    ];

    const monthlyData: Record<
      number,
      [string, string, string]
    > = {
      1: [
        `新年の${this.service}案内`,
        `${this.area} ${this.service} 年始`,
        "正月三が日の対応を明示",
      ],
      2: [
        `冬の法要・春彼岸準備`,
        `${this.area} 法要 冬`,
        "節分投稿で地域感を出す",
      ],
      3: [
        `春彼岸・お墓参り`,
        `${this.area} 春彼岸 ${this.service}`,
        "彼岸は検索量増加",
      ],
      4: [
        `年度替わりの各種手続き`,
        `${this.area} ${this.service} 手続き`,
        "入学・転居シーズン",
      ],
      5: [
        `GW対応・5月の法要`,
        `${this.area} ${this.service} GW`,
        "連休中の対応を告知",
      ],
      6: [
        `梅雨季節・父の日法要`,
        `${this.area} ${this.service} 6月`,
        "父の日にちなんだ投稿",
      ],
      7: [
        `お盆準備・早めの相談`,
        `${this.area} お盆 ${this.service}`,
        "お盆1ヶ月前から告知開始",
      ],
      8: [
        `お盆シーズン対応`,
        `${this.area} お盆 対応`,
        "最盛期は毎日投稿推奨",
      ],
      9: [
        `秋彼岸・納骨案内`,
        `${this.area} 秋彼岸 ${this.service}`,
        "彼岸は検索量増加",
      ],
      10: [
        `秋の忌日・一周忌案内`,
        `${this.area} 一周忌 法要`,
        "忌日関連キーワード強化",
      ],
      11: [
        `年末に向けた事前相談`,
        `${this.area} ${this.service} 年末 準備`,
        "事前相談の促進",
      ],
      12: [
        `年末年始の緊急対応`,
        `${this.area} ${this.service} 年末年始`,
        "年末は検索量増加",
      ],
    };

    for (let month = 1; month <= 12; month++) {
      const [theme, kw, note] = monthlyData[month];
      lines.push(`| ${month}月 | ${theme} | ${kw} | ${note} |`);
    }

    return lines.join("\n");
  }
}
