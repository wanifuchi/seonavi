import Link from "next/link";
import {
  ListChecks,
  BarChart3,
  KeyRound,
  Code2,
  ArrowRight,
  Inbox,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const stats = [
  {
    title: "タスク数",
    value: "7",
    description: "実行可能なSEOタスク",
    icon: ListChecks,
  },
  {
    title: "分析済み",
    value: "0",
    description: "完了した分析数",
    icon: BarChart3,
  },
  {
    title: "キーワード数",
    value: "0",
    description: "抽出済みキーワード",
    icon: KeyRound,
  },
  {
    title: "Schema監査",
    value: "0",
    description: "監査済みページ数",
    icon: Code2,
  },
];

const quickActions = [
  {
    title: "コンテンツギャップ分析",
    href: "/tasks/content-gap",
    description: "競合との差分を発見",
  },
  {
    title: "キーワード抽出",
    href: "/tasks/keyword-extraction",
    description: "ローカルキーワードを生成",
  },
  {
    title: "Schema監査",
    href: "/tasks/schema-audit",
    description: "構造化データを評価",
  },
  {
    title: "GBP投稿最適化",
    href: "/tasks/gbp-post-optimization",
    description: "Google投稿を自動生成",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          SEO Intelligence Agent
        </h1>
        <p className="mt-2 text-muted-foreground">
          ローカルビジネス向けSEO自動分析ツール。AIを活用してSEO戦略を効率化します。
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* クイックアクション */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">クイックアクション</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between pt-0">
                  <div>
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 最近の結果 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">最近の分析結果</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="size-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              まだ分析結果がありません
            </p>
            <p className="text-xs text-muted-foreground">
              タスクを実行すると、ここに結果が表示されます
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/tasks">
                タスク一覧を見る
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
