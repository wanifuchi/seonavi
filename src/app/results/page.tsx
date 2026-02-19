import { Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function ResultsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">分析結果</h1>
        <p className="mt-1 text-muted-foreground">
          実行済みタスクの分析結果を確認できます
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Inbox className="size-16 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">
            まだ分析結果がありません
          </p>
          <p className="text-sm text-muted-foreground">
            タスクを実行すると、ここに結果が蓄積されます
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
