import {
  FileSearch,
  Code2,
  KeyRound,
  GitCompare,
  Megaphone,
  CalendarDays,
  Search,
  type LucideIcon,
} from "lucide-react";

export type TaskField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "url";
  placeholder: string;
  required?: boolean;
};

export type TaskDefinition = {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
  fields: TaskField[];
};

export const TASKS: TaskDefinition[] = [
  {
    id: "content-gap",
    number: 1,
    title: "コンテンツギャップ分析",
    description: "競合サイトを分析し、自社サイトに不足している記事テーマを特定します",
    icon: FileSearch,
    fields: [
      {
        name: "myUrl",
        label: "自社サイトURL",
        type: "url",
        placeholder: "https://example.com",
        required: true,
      },
      {
        name: "competitorUrls",
        label: "競合サイトURL（改行区切り）",
        type: "textarea",
        placeholder: "https://competitor1.com\nhttps://competitor2.com",
        required: true,
      },
      {
        name: "serviceName",
        label: "サービス名",
        type: "text",
        placeholder: "例: 葬儀社",
        required: true,
      },
      {
        name: "area",
        label: "対象エリア",
        type: "text",
        placeholder: "例: 横浜市",
        required: true,
      },
    ],
  },
  {
    id: "schema-audit",
    number: 2,
    title: "Schema監査",
    description: "構造化データの評価とJSON-LDスニペットを自動生成します",
    icon: Code2,
    fields: [
      {
        name: "targetUrl",
        label: "対象ページURL",
        type: "url",
        placeholder: "https://example.com",
        required: true,
      },
      {
        name: "businessType",
        label: "ビジネスタイプ",
        type: "text",
        placeholder: "例: FuneralHome, LocalBusiness",
        required: true,
      },
    ],
  },
  {
    id: "keyword-extraction",
    number: 3,
    title: "キーワード抽出",
    description: "購入意欲の高いローカルキーワードを自動生成します",
    icon: KeyRound,
    fields: [
      {
        name: "serviceName",
        label: "サービス名",
        type: "text",
        placeholder: "例: 家族葬",
        required: true,
      },
      {
        name: "area",
        label: "対象エリア",
        type: "text",
        placeholder: "例: 横浜市",
        required: true,
      },
      {
        name: "additionalContext",
        label: "補足情報",
        type: "textarea",
        placeholder: "ターゲット顧客層、特徴的なサービスなど",
      },
    ],
  },
  {
    id: "positioning-comparison",
    number: 4,
    title: "ポジショニング比較",
    description: "自社と競合の差別化ポイントを特定し、戦略を提案します",
    icon: GitCompare,
    fields: [
      {
        name: "myUrl",
        label: "自社サイトURL",
        type: "url",
        placeholder: "https://example.com",
        required: true,
      },
      {
        name: "competitorUrls",
        label: "競合サイトURL（改行区切り）",
        type: "textarea",
        placeholder: "https://competitor1.com\nhttps://competitor2.com",
        required: true,
      },
      {
        name: "serviceName",
        label: "サービス名",
        type: "text",
        placeholder: "例: 葬儀社",
        required: true,
      },
      {
        name: "area",
        label: "対象エリア",
        type: "text",
        placeholder: "例: 横浜市",
        required: false,
      },
    ],
  },
  {
    id: "gbp-post-optimization",
    number: 5,
    title: "GBP投稿最適化",
    description: "Googleビジネスプロフィール投稿10本を自動生成します",
    icon: Megaphone,
    fields: [
      {
        name: "serviceName",
        label: "サービス名",
        type: "text",
        placeholder: "例: 葬儀社",
        required: true,
      },
      {
        name: "area",
        label: "対象エリア",
        type: "text",
        placeholder: "例: 横浜市",
        required: true,
      },
      {
        name: "keywords",
        label: "使用キーワード（改行区切り）",
        type: "textarea",
        placeholder: "横浜 葬儀\n家族葬 横浜市",
      },
      {
        name: "tone",
        label: "トーン・スタイル",
        type: "text",
        placeholder: "例: 親しみやすい、専門的、カジュアル",
      },
    ],
  },
  {
    id: "posting-strategy",
    number: 6,
    title: "投稿戦略設計",
    description: "週間・月間の投稿計画を作成し、効果的なコンテンツ配信を支援します",
    icon: CalendarDays,
    fields: [
      {
        name: "serviceName",
        label: "サービス名",
        type: "text",
        placeholder: "例: 葬儀社",
        required: true,
      },
      {
        name: "area",
        label: "対象エリア",
        type: "text",
        placeholder: "例: 横浜市",
        required: true,
      },
      {
        name: "frequency",
        label: "投稿頻度",
        type: "text",
        placeholder: "例: 週3回、毎日",
      },
      {
        name: "platforms",
        label: "対象プラットフォーム",
        type: "text",
        placeholder: "例: GBP, Instagram, ブログ",
      },
    ],
  },
  {
    id: "keyword-research",
    number: 7,
    title: "キーワードリサーチ",
    description: "競合サイトからキーワードを分析し、SEO戦略に活用します",
    icon: Search,
    fields: [
      {
        name: "competitorUrls",
        label: "競合サイトURL（改行区切り）",
        type: "textarea",
        placeholder: "https://competitor1.com\nhttps://competitor2.com",
        required: true,
      },
      {
        name: "serviceName",
        label: "サービス名",
        type: "text",
        placeholder: "例: 葬儀社",
        required: true,
      },
      {
        name: "area",
        label: "対象エリア",
        type: "text",
        placeholder: "例: 横浜市",
        required: true,
      },
    ],
  },
];

export function getTaskById(id: string): TaskDefinition | undefined {
  return TASKS.find((task) => task.id === id);
}
