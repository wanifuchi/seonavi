"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, KeyRound, Building2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [area, setArea] = useState("");
  const [myUrl, setMyUrl] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([""]);
  const [saved, setSaved] = useState(false);

  const addCompetitorUrl = () => {
    setCompetitorUrls((prev) => [...prev, ""]);
  };

  const removeCompetitorUrl = (index: number) => {
    setCompetitorUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCompetitorUrl = (index: number, value: string) => {
    setCompetitorUrls((prev) =>
      prev.map((url, i) => (i === index ? value : url))
    );
  };

  const handleSave = () => {
    // ローカルストレージに保存
    const config = {
      apiKey,
      serviceName,
      area,
      myUrl,
      competitorUrls: competitorUrls.filter((url) => url.trim()),
    };
    localStorage.setItem("seo-agent-config", JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // 初期読み込み
  useEffect(() => {
    const stored = localStorage.getItem("seo-agent-config");
    if (stored) {
      try {
        const config = JSON.parse(stored);
        setApiKey(config.apiKey || "");
        setServiceName(config.serviceName || "");
        setArea(config.area || "");
        setMyUrl(config.myUrl || "");
        setCompetitorUrls(
          config.competitorUrls?.length ? config.competitorUrls : [""]
        );
      } catch {
        // パースエラーの場合はデフォルト値を使用
      }
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        <p className="mt-1 text-muted-foreground">
          APIキーとプロジェクト設定を管理します
        </p>
      </div>

      {/* APIキー設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">APIキー設定</CardTitle>
              <CardDescription>
                Google Generative AI APIキーを設定してください
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">GOOGLE_GENERATIVE_AI_API_KEY</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Google AI StudioからAPIキーを取得してください
            </p>
          </div>
        </CardContent>
      </Card>

      {/* プロジェクト設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">プロジェクト設定</CardTitle>
              <CardDescription>
                分析対象のビジネス情報を入力してください
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceName">サービス名</Label>
            <Input
              id="serviceName"
              placeholder="例: 横浜セレモニーホール"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">対象エリア</Label>
            <Input
              id="area"
              placeholder="例: 渋谷区"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="myUrl">自社サイトURL</Label>
            <Input
              id="myUrl"
              type="url"
              placeholder="https://example.com"
              value={myUrl}
              onChange={(e) => setMyUrl(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>競合サイトURL</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addCompetitorUrl}
              >
                <Plus className="size-3" />
                追加
              </Button>
            </div>
            {competitorUrls.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="url"
                  placeholder={`https://competitor${index + 1}.com`}
                  value={url}
                  onChange={(e) => updateCompetitorUrl(index, e.target.value)}
                />
                {competitorUrls.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCompetitorUrl(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-500">保存しました</span>
        )}
        <Button onClick={handleSave} size="lg">
          <Save className="size-4" />
          設定を保存
        </Button>
      </div>
    </div>
  );
}
