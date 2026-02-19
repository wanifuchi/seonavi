import Link from "next/link";
import {
  FileSearch,
  Code2,
  KeyRound,
  GitCompare,
  Megaphone,
  CalendarDays,
  Search,
  ArrowRight,
  Globe,
  Target,
  Lightbulb,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type TaskGuide = {
  id: string;
  number: number;
  title: string;
  icon: LucideIcon;
  summary: string;
  whatItDoes: string[];
  inputs: { name: string; description: string; required: boolean }[];
  outputs: string[];
  useCases: string[];
  analysisScope: string;
  estimatedTime: string;
};

const TASK_GUIDES: TaskGuide[] = [
  {
    id: "content-gap",
    number: 1,
    title: "コンテンツギャップ分析",
    icon: FileSearch,
    summary:
      "競合サイトが扱っていて自社にないコンテンツテーマを発見し、新規記事の企画を提案します。",
    whatItDoes: [
      "入力した各URLのページ情報（タイトル、H1〜H3見出し、メタディスクリプション）をAIクローラーが取得",
      "各サイトのトピッククラスターを抽出し、共通テーマとギャップを特定",
      "競合が扱っているのに自社にないテーマを「コンテンツギャップ」として検出",
      "ギャップに基づいて、作成すべき記事テーマ5本を優先度付きで提案",
    ],
    inputs: [
      {
        name: "自社サイトURL",
        description: "分析したい自社サイトのURL。トップページまたは主要ページを指定",
        required: true,
      },
      {
        name: "競合サイトURL",
        description:
          "比較対象の競合サイトURL（2〜5個）。改行区切りで入力。同業種・同地域の競合を推奨",
        required: true,
      },
      {
        name: "サービス名",
        description: "提供しているサービスの名称（例: 葬儀社、家族葬専門）",
        required: true,
      },
      {
        name: "対象エリア",
        description: "サービス提供エリア（例: 横浜市、川崎市）",
        required: true,
      },
    ],
    outputs: [
      "各サイトの主要トピック一覧表",
      "コンテンツギャップ一覧（競合が扱い自社にないテーマ）",
      "ブルーオーシャン候補（どの競合も扱っていないテーマ）",
      "優先度付き記事提案5本（タイトル案・狙いキーワード・記事構成）",
    ],
    useCases: [
      "新規ブログ記事のネタ探しに困っている時",
      "競合に検索順位で負けている原因を知りたい時",
      "どのテーマで記事を書けば上位表示できるか知りたい時",
      "コンテンツマーケティング戦略の立案",
    ],
    analysisScope: "入力したURLのページ単体を分析（サイト全体ではなく指定ページのみ）",
    estimatedTime: "約30秒〜1分",
  },
  {
    id: "schema-audit",
    number: 2,
    title: "Schema監査",
    icon: Code2,
    summary:
      "ページの構造化データ（JSON-LD等）を評価し、不足しているSchemaのJSON-LDコードを自動生成します。",
    whatItDoes: [
      "指定ページのHTMLソースからJSON-LD、Microdata、RDFaを抽出",
      "既存の構造化データを評価（必須プロパティの充足度をチェック）",
      "不足しているSchemaを優先度付きで特定（高・中・低）",
      "優先度「高」のSchemaについて、即座に使えるJSON-LDコードを生成",
    ],
    inputs: [
      {
        name: "対象ページURL",
        description: "構造化データを監査したいページのURL",
        required: true,
      },
      {
        name: "ビジネスタイプ",
        description:
          "Schema.orgのタイプ名（例: FuneralHome, LocalBusiness）。ビジネスに最適なタイプを指定",
        required: true,
      },
    ],
    outputs: [
      "既存Schema一覧と評価（良好/不足あり/重大な問題）",
      "不足しているSchemaの優先度付きリスト",
      "優先度「高」のJSON-LDコード（コピペで使用可能）",
      "LocalBusiness、BreadcrumbList、FAQPage等のスニペット",
    ],
    useCases: [
      "Google検索でリッチスニペット（星評価、FAQ等）を表示させたい時",
      "ローカルSEOを強化したい時（LocalBusiness Schema）",
      "サイトリニューアル時の構造化データチェック",
      "開発者にSchema実装を依頼する際の仕様書として",
    ],
    analysisScope: "入力した1ページのHTMLソースを分析",
    estimatedTime: "約20秒〜40秒",
  },
  {
    id: "keyword-extraction",
    number: 3,
    title: "キーワード抽出",
    icon: KeyRound,
    summary:
      "サービス名と地域から、購買意欲の高いローカルキーワードを自動生成・分類します。",
    whatItDoes: [
      "サービス名×地域名×修飾語（緊急、安い、口コミ等）を掛け合わせてキーワードを生成",
      "各キーワードの検索意図を分類（地域意図/緊急性/購入意図）",
      "難易度スコア（1-10）と優先度を自動判定",
      "複合キーワード（ロングテール）も含めて網羅的にリストアップ",
    ],
    inputs: [
      {
        name: "サービス名",
        description: "キーワードの軸となるサービス名（例: 家族葬、一日葬、直葬）",
        required: true,
      },
      {
        name: "対象エリア",
        description: "ターゲットとする地域名（例: 横浜市、神奈川県）",
        required: true,
      },
      {
        name: "補足情報",
        description:
          "ターゲット顧客層や特徴的なサービス（例: 低価格、24時間対応、無宗教）",
        required: false,
      },
    ],
    outputs: [
      "キーワード一覧テーブル（メインKW、関連KW、難易度、優先度）",
      "検索意図別の分類（地域検索、緊急検索、比較検索等）",
      "優先的に対策すべきキーワードの推奨",
    ],
    useCases: [
      "SEO対策するキーワードを選定したい時",
      "リスティング広告のキーワードリストを作りたい時",
      "新しいサービスページのキーワード設計",
      "地域密着型ビジネスのSEO戦略立案",
    ],
    analysisScope: "URLは不要。入力されたサービス名・地域名からAIが生成",
    estimatedTime: "約15秒〜30秒",
  },
  {
    id: "positioning-comparison",
    number: 4,
    title: "ポジショニング比較",
    icon: GitCompare,
    summary:
      "自社と競合のWebサイトを比較し、差別化ポイントと弱点を明確にします。",
    whatItDoes: [
      "自社と競合サイトのページ情報を取得（サービス内容、地域、強み等）",
      "サービス網羅性、地域カバレッジ、信頼要素、価格競争力を比較",
      "自社の弱点と優位性を具体的に指摘",
      "差別化のための具体的なアクション提案",
    ],
    inputs: [
      {
        name: "自社サイトURL",
        description: "自社のWebサイトURL",
        required: true,
      },
      {
        name: "競合サイトURL",
        description: "比較したい競合のURL（1〜3個）。改行区切りで入力",
        required: true,
      },
      {
        name: "サービス名",
        description: "比較する軸となるサービス名",
        required: true,
      },
    ],
    outputs: [
      "サービス比較表（提供サービス数、専門度）",
      "信頼要素比較（口コミ数、評価点、資格、実績）",
      "自社の弱点リスト（具体的な改善提案付き）",
      "自社の優位性リスト（活かすべきポイント）",
    ],
    useCases: [
      "競合に対してどこが負けているか知りたい時",
      "Webサイトリニューアルの方針を決めたい時",
      "営業資料で自社の強みを整理したい時",
      "新規参入するエリアの競合調査",
    ],
    analysisScope: "入力した各URLのページ単体を分析",
    estimatedTime: "約30秒〜1分",
  },
  {
    id: "gbp-post-optimization",
    number: 5,
    title: "GBP投稿最適化",
    icon: Megaphone,
    summary:
      "Googleビジネスプロフィールに投稿する記事10本を、SEOに最適化された形で自動生成します。",
    whatItDoes: [
      "サービス名・地域・キーワードに基づいてGBP投稿を10本生成",
      "各投稿にCTA（「今すぐ電話」「詳しくはこちら」等）を自動付与",
      "投稿タイプを多様化（キャンペーン、お知らせ、実績紹介等）",
      "文字数制限（1500文字）に収まるよう最適化",
    ],
    inputs: [
      {
        name: "サービス名",
        description: "投稿するビジネスのサービス名",
        required: true,
      },
      {
        name: "対象エリア",
        description: "ビジネスの所在地域",
        required: true,
      },
      {
        name: "使用キーワード",
        description: "投稿に含めたいキーワード（改行区切り）。Task 3の結果を活用可能",
        required: false,
      },
      {
        name: "トーン・スタイル",
        description: "投稿の文体（親しみやすい、専門的、丁寧 等）",
        required: false,
      },
    ],
    outputs: [
      "GBP投稿10本（タイトル、本文、CTA付き）",
      "各投稿の推奨投稿日・時間帯",
      "使用キーワードのハイライト",
    ],
    useCases: [
      "GBPの投稿を定期的に更新したいがネタがない時",
      "GBP投稿でローカルSEOを強化したい時",
      "投稿内容を外部ライターに依頼するための原稿ベース",
      "複数店舗の投稿を効率的に作成したい時",
    ],
    analysisScope: "URLは不要。入力情報からAIが投稿文を生成",
    estimatedTime: "約20秒〜40秒",
  },
  {
    id: "posting-strategy",
    number: 6,
    title: "投稿戦略設計",
    icon: CalendarDays,
    summary:
      "週間・月間の投稿スケジュールを設計し、効果的なコンテンツ配信計画を提案します。",
    whatItDoes: [
      "曜日別の最適な投稿テーマとタイミングを設計",
      "月別の季節テーマ（お盆、年末年始等）を組み込んだ年間計画",
      "投稿頻度とプラットフォーム別の最適化提案",
      "Task 5で生成した投稿を配置するスケジュール表を作成",
    ],
    inputs: [
      {
        name: "サービス名",
        description: "対象ビジネスのサービス名",
        required: true,
      },
      {
        name: "対象エリア",
        description: "ビジネスの所在地域",
        required: true,
      },
      {
        name: "投稿頻度",
        description: "希望する投稿頻度（例: 週3回、毎日）",
        required: false,
      },
      {
        name: "対象プラットフォーム",
        description: "投稿先（例: GBP、Instagram、ブログ）",
        required: false,
      },
    ],
    outputs: [
      "週間投稿計画（曜日×テーマ×プラットフォーム）",
      "月間カレンダー（季節イベントを考慮）",
      "投稿テーマのローテーション表",
      "KPI目標と効果測定のポイント",
    ],
    useCases: [
      "投稿をいつ・何を出すか計画的に管理したい時",
      "SNSやGBPの投稿スケジュールを一元管理したい時",
      "季節に合わせたコンテンツ配信を行いたい時",
      "チームで投稿運用を分担する際のガイドライン作成",
    ],
    analysisScope: "URLは不要。入力情報からAIが戦略を設計",
    estimatedTime: "約15秒〜30秒",
  },
  {
    id: "keyword-research",
    number: 7,
    title: "キーワードリサーチ",
    icon: Search,
    summary:
      "競合サイトの上位ページを分析し、狙うべきキーワードと難易度を可視化します。",
    whatItDoes: [
      "競合サイトのサイトマップを探索し、上位20ページのURLとコンテンツを取得",
      "各ページの狙いキーワード（タイトル、H1、メタディスクリプションから推定）を抽出",
      "キーワードごとの難易度を相対評価（1-10スコア）",
      "優先順位付きのキーワード戦略テーブルを生成",
    ],
    inputs: [
      {
        name: "競合サイトURL",
        description:
          "分析したい競合サイトのURL（1〜3個）。サイトマップが読み取れるサイトが最適",
        required: true,
      },
      {
        name: "サービス名",
        description: "自社のサービス名（フィルタリングの基準に使用）",
        required: true,
      },
      {
        name: "対象エリア",
        description: "ターゲット地域",
        required: true,
      },
    ],
    outputs: [
      "競合サイトの主要ページ一覧（URL、タイトル、推定キーワード）",
      "キーワード分析テーブル（優先度、メインKW、関連KW、難易度）",
      "参入しやすいキーワード（難易度1-3）のリスト",
      "差別化が必要なキーワード（難易度7-10）のリスト",
    ],
    useCases: [
      "競合がどのキーワードで上位表示しているか知りたい時",
      "参入しやすいキーワードを探したい時",
      "SEOコンテンツ戦略を競合データに基づいて立てたい時",
      "Ahrefs等の有料ツールの代替として簡易分析したい時",
    ],
    analysisScope:
      "サイトマップから最大20ページを自動取得（他タスクと異なりサイト全体を探索）",
    estimatedTime: "約1分〜2分（ページ数による）",
  },
];

function TaskGuideCard({ guide }: { guide: TaskGuide }) {
  const Icon = guide.icon;

  return (
    <Card id={guide.id} className="scroll-mt-20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Task {guide.number}</Badge>
                <Badge variant="secondary">{guide.estimatedTime}</Badge>
              </div>
              <CardTitle className="mt-1 text-xl">{guide.title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {guide.summary}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 何をするか */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Target className="size-4 text-blue-400" />
            この機能でできること
          </h3>
          <ol className="space-y-1.5 text-sm text-muted-foreground">
            {guide.whatItDoes.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-medium text-blue-400">
                  {i + 1}.
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        <Separator />

        {/* 入力項目 */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4 text-green-400" />
            入力項目
          </h3>
          <div className="space-y-2">
            {guide.inputs.map((input, i) => (
              <div
                key={i}
                className="rounded-md border border-border/50 bg-muted/30 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{input.name}</span>
                  {input.required ? (
                    <Badge
                      variant="destructive"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      必須
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      任意
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {input.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* 出力結果 */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Globe className="size-4 text-purple-400" />
            出力される結果
          </h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {guide.outputs.map((output, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 text-purple-400">-</span>
                {output}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* 活用シーン */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4 text-yellow-400" />
            こんな時に役立つ
          </h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {guide.useCases.map((useCase, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 text-yellow-400">-</span>
                {useCase}
              </li>
            ))}
          </ul>
        </div>

        {/* 分析範囲 */}
        <div className="rounded-md border border-border/50 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">分析範囲: </span>
            {guide.analysisScope}
          </p>
        </div>

        {/* 実行リンク */}
        <Link
          href={`/tasks/${guide.id}`}
          className="flex items-center justify-center gap-2 rounded-md bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          このタスクを実行する
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">機能ガイド</h1>
        <p className="mt-1 text-muted-foreground">
          SEO Intelligence
          Agentの7つの分析機能について、入力内容・出力結果・活用方法を詳しく説明します。
        </p>
      </div>

      {/* 目次 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">目次</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="grid gap-1.5 sm:grid-cols-2">
            {TASK_GUIDES.map((guide) => (
              <a
                key={guide.id}
                href={`#${guide.id}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <Badge variant="outline" className="shrink-0">
                  {guide.number}
                </Badge>
                <span>{guide.title}</span>
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* 各タスクの詳細 */}
      {TASK_GUIDES.map((guide) => (
        <TaskGuideCard key={guide.id} guide={guide} />
      ))}
    </div>
  );
}
