"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
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

// Markdownカスタムコンポーネント - 結果の視認性を向上
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-6 mb-4 border-b border-border pb-2 text-xl font-bold text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 border-b border-border/50 pb-1.5 text-lg font-semibold text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 text-base font-semibold text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed text-muted-foreground last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 space-y-1.5 pl-5 list-disc marker:text-primary/60">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 space-y-1.5 pl-5 list-decimal marker:text-primary/60">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-muted-foreground leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  hr: () => <hr className="my-5 border-border/60" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-3 border-primary/40 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  // テーブル
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50 text-foreground">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-muted/30">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-muted-foreground">{children}</td>
  ),
  // コードブロック
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-") || String(children).includes("\n");
    if (isBlock) {
      return (
        <div className="group relative my-4">
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed">
            <code className="text-muted-foreground">{children}</code>
          </pre>
        </div>
      );
    }
    return (
      <code className="rounded-md bg-muted/50 px-1.5 py-0.5 text-xs font-mono text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

export default function TaskPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const task = getTaskById(taskId);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 設定ページの保存値をフォームに自動反映
  useEffect(() => {
    if (!task) return;
    try {
      const stored = localStorage.getItem("seo-agent-config");
      if (!stored) return;
      const config = JSON.parse(stored);
      const prefill: Record<string, string> = {};

      for (const field of task.fields) {
        if (field.name === "serviceName" && config.serviceName) {
          prefill[field.name] = config.serviceName;
        } else if (field.name === "area" && config.area) {
          prefill[field.name] = config.area;
        } else if (field.name === "myUrl" && config.myUrl) {
          prefill[field.name] = config.myUrl;
        } else if (
          field.name === "competitorUrls" &&
          config.competitorUrls?.length
        ) {
          prefill[field.name] = config.competitorUrls
            .filter((u: string) => u.trim())
            .join("\n");
        }
      }

      if (Object.keys(prefill).length > 0) {
        setFormData((prev) => ({ ...prefill, ...prev }));
      }
    } catch {
      // パースエラーは無視
    }
  }, [task]);

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
            <div className="max-w-none text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {result}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
