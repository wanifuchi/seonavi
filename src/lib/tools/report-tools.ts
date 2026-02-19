/**
 * report-tools.ts - レポート生成・整形ユーティリティ
 *
 * Markdown / CSV / JSON 形式でSEO分析レポートを生成する。
 * Web環境向けに、ファイル保存ではなく文字列を返す設計。
 */

// --------------------------------------------------------
// ファイル名生成
// --------------------------------------------------------

/**
 * 一意のファイル名を生成する
 *
 * @param taskId - タスクID（例: task01）
 * @param identifier - URLのドメインまたはサービス名など
 * @param suffix - 拡張子（md / csv / json）
 * @returns 例: task01_20240115_143022_example-com.md
 */
export function makeFilename(
  taskId: string,
  identifier: string,
  suffix: string = "md",
): string {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const safeId = identifier.replace(/[^\w\-]/g, "_").slice(0, 30);
  return `${taskId}_${ts}_${safeId}.${suffix}`;
}

/**
 * URLからドメインを取得する
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

// --------------------------------------------------------
// Markdown生成ヘルパー
// --------------------------------------------------------

/**
 * レポートヘッダーを生成する
 *
 * @param taskName - タスク名（例: コンテンツギャップ分析）
 * @param meta - メタ情報（実行日時・URL・サービス名など）
 */
export function makeReportHeader(
  taskName: string,
  meta: Record<string, string | string[]>,
): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const lines: string[] = [
    `# ${taskName}`,
    "",
    `**実行日時:** ${dateStr}`,
  ];

  for (const [key, value] of Object.entries(meta)) {
    if (Array.isArray(value)) {
      lines.push(`**${key}:**`);
      for (const v of value) {
        lines.push(`  - ${v}`);
      }
    } else {
      lines.push(`**${key}:** ${value}`);
    }
  }

  lines.push("", "---", "");
  return lines.join("\n");
}

/**
 * Markdownテーブルを生成する
 *
 * @param headers - ヘッダー行
 * @param rows - データ行
 */
export function makeMarkdownTable(
  headers: string[],
  rows: (string | number)[][],
): string {
  if (rows.length === 0) {
    return (
      `| ${headers.join(" | ")} |\n` +
      `|${"---|".repeat(headers.length)}\n` +
      `| データなし |`
    );
  }

  const headerRow = `| ${headers.map(String).join(" | ")} |`;
  const separator = `|${"---|".repeat(headers.length)}`;
  const dataRows = rows.map(
    (row) => `| ${row.map(String).join(" | ")} |`,
  );

  return [headerRow, separator, ...dataRows].join("\n");
}

/**
 * 推奨アクションリストをMarkdownで生成する
 */
export function makeActionList(
  actions: string[],
  title: string = "推奨アクション（優先度順）",
): string {
  if (actions.length === 0) return "";

  const lines: string[] = [`## ${title}`, ""];
  for (let i = 0; i < actions.length; i++) {
    lines.push(`${i + 1}. ${actions[i]}`);
  }
  return lines.join("\n");
}

// --------------------------------------------------------
// CSV変換ヘルパー
// --------------------------------------------------------

/**
 * 辞書のリストをCSV文字列に変換する
 */
export function dictListToCsv(
  data: Record<string, string | number>[],
): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const lines: string[] = [headers.map((h) => `"${h}"`).join(",")];

  for (const row of data) {
    lines.push(
      headers.map((h) => `"${String(row[h] ?? "")}"`).join(","),
    );
  }

  return lines.join("\n");
}

/**
 * MarkdownテーブルをCSVに変換する
 */
export function markdownTableToCsv(markdown: string): string {
  const csvLines: string[] = [];
  let inTable = false;

  for (const line of markdown.split("\n")) {
    const stripped = line.trim();
    if (stripped.startsWith("|") && !stripped.startsWith("|---")) {
      inTable = true;
      // パイプで分割してセルを取得
      const cells = stripped
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      csvLines.push(cells.map((c) => `"${c}"`).join(","));
    } else if (inTable && !stripped.startsWith("|")) {
      inTable = false;
    }
  }

  return csvLines.join("\n");
}

// --------------------------------------------------------
// レポートセーバー（Web版: 文字列を返す）
// --------------------------------------------------------

/** 保存結果 */
export interface SaveResult {
  markdown?: string;
  csv?: string;
  json?: string;
}

/**
 * SEO分析レポートを生成するクラス。
 * Web環境向けに、ファイル保存ではなく文字列を返す設計。
 */
export class ReportSaver {
  private savedReports: {
    taskId: string;
    identifier: string;
    format: string;
    content: string;
  }[] = [];

  /** Markdown文字列を返す */
  saveMarkdown(
    content: string,
    taskId: string,
    identifier: string,
  ): string {
    this.savedReports.push({
      taskId,
      identifier,
      format: "md",
      content,
    });
    return content;
  }

  /** CSV文字列を返す */
  saveCsv(
    content: string,
    taskId: string,
    identifier: string,
  ): string {
    this.savedReports.push({
      taskId,
      identifier,
      format: "csv",
      content,
    });
    return content;
  }

  /** JSON文字列を返す */
  saveJson(
    data: Record<string, unknown> | unknown[],
    taskId: string,
    identifier: string,
  ): string {
    const content = JSON.stringify(data, null, 2);
    this.savedReports.push({
      taskId,
      identifier,
      format: "json",
      content,
    });
    return content;
  }

  /** Markdown + CSV + JSON をまとめて生成 */
  saveAll(
    markdown: string,
    taskId: string,
    identifier: string,
    csvData?: string,
    jsonData?: Record<string, unknown> | unknown[],
  ): SaveResult {
    const result: SaveResult = {};

    result.markdown = this.saveMarkdown(markdown, taskId, identifier);

    if (csvData) {
      result.csv = this.saveCsv(csvData, taskId, identifier);
    }

    if (jsonData) {
      result.json = this.saveJson(jsonData, taskId, identifier);
    }

    return result;
  }

  /** 保存したレポートの一覧を返す */
  getSummary(): string {
    if (this.savedReports.length === 0) {
      return "保存されたレポートはありません。";
    }
    const lines: string[] = ["保存レポート一覧:"];
    for (const report of this.savedReports) {
      const size = new Blob([report.content]).size;
      const filename = makeFilename(
        report.taskId,
        report.identifier,
        report.format,
      );
      lines.push(`  - ${filename} (${size.toLocaleString()} bytes)`);
    }
    return lines.join("\n");
  }

  /** 保存した全レポートを取得 */
  getSavedReports() {
    return this.savedReports;
  }
}

// --------------------------------------------------------
// テキスト整形ユーティリティ
// --------------------------------------------------------

/** Markdownからテーブル部分のみ抽出 */
export function extractTablesFromMarkdown(markdown: string): string[] {
  const tables: string[] = [];
  const lines = markdown.split("\n");
  let currentTable: string[] = [];

  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith("|")) {
      currentTable.push(line);
    } else {
      if (currentTable.length > 0) {
        tables.push(currentTable.join("\n"));
        currentTable = [];
      }
    }
  }

  if (currentTable.length > 0) {
    tables.push(currentTable.join("\n"));
  }

  return tables;
}

/** テキストを指定文字数で切り詰める */
export function truncateText(
  text: string,
  maxChars: number = 300,
  suffix: string = "...",
): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars - suffix.length) + suffix;
}

/** URLをファイル名に使えるフォーマットに変換 */
export function cleanUrlForFilename(url: string): string {
  const domain = getDomain(url);
  return domain.replace(/[^\w\-]/g, "_").slice(0, 30);
}
