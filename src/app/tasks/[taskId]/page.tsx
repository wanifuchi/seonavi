"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Play, Loader2, CheckCircle2, HelpCircle } from "lucide-react";

import { getTaskById } from "@/lib/task-definitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default function TaskPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const task = getTaskById(taskId);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">タスクが見つかりません</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/tasks">
            <ArrowLeft className="size-4" />
            タスク一覧に戻る
          </Link>
        </Button>
      </div>
    );
  }

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      // プログレスアニメーション
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const response = await fetch("/api/execute-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          ...formData,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error("タスクの実行に失敗しました");
      }

      const data = await response.json();
      setProgress(100);
      setResult(data.result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = task.fields
    .filter((field) => field.required)
    .every((field) => formData[field.name]?.trim());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* パンくずナビ */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/tasks" className="hover:text-foreground transition-colors">
          タスク一覧
        </Link>
        <span>/</span>
        <span className="text-foreground">{task.title}</span>
      </div>

      {/* タスクヘッダー */}
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <task.icon className="size-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Task {task.number}</Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {task.title}
          </h1>
          <p className="mt-1 text-muted-foreground">{task.description}</p>
          <Link
            href={`/guide#${task.id}`}
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <HelpCircle className="size-3" />
            この機能の詳しい説明を見る
          </Link>
        </div>
      </div>

      {/* 入力フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">入力パラメータ</CardTitle>
          <CardDescription>
            タスクの実行に必要な情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    handleFieldChange(field.name, e.target.value)
                  }
                  rows={4}
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    handleFieldChange(field.name, e.target.value)
                  }
                />
              )}
            </div>
          ))}

          <Separator className="my-4" />

          <Button
            onClick={handleExecute}
            disabled={!isFormValid || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                分析実行中...
              </>
            ) : (
              <>
                <Play className="size-4" />
                タスクを実行
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* プログレス表示 */}
      {isLoading && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">分析処理中...</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                AIがデータを分析しています。しばらくお待ちください...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 結果表示 */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-500" />
              <CardTitle className="text-base">分析結果</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
