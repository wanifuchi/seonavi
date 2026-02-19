import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TASKS } from "@/lib/task-definitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">タスク一覧</h1>
        <p className="mt-1 text-muted-foreground">
          7つのSEO分析タスクから実行したいものを選択してください
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TASKS.map((task) => (
          <Link key={task.id} href={`/tasks/${task.id}`}>
            <Card className="h-full cursor-pointer transition-colors hover:bg-accent/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <task.icon className="size-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Task {task.number}
                      </Badge>
                    </div>
                    <CardTitle className="mt-1 text-base">
                      {task.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {task.description}
                </CardDescription>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {task.fields.length}個の入力項目
                  </span>
                  <Button variant="ghost" size="sm" className="gap-1">
                    実行する
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
