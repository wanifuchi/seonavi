/**
 * fetch-page.ts - Webページ取得・HTML解析ツール
 *
 * native fetch + cheerio によるHTML解析をサポート。
 */

import * as cheerio from "cheerio";

// --------------------------------------------------------
// データ型
// --------------------------------------------------------

/** リンク情報 */
export interface LinkData {
  url: string;
  text: string;
}

/** ナビゲーションリンク */
export interface NavLink {
  text: string;
  href: string;
}

/** 1ページのSEO関連データ */
export interface PageData {
  url: string;
  status: "pending" | "success" | "error" | "timeout" | "blocked";
  httpStatus: number | null;
  title: string;
  h1: string;
  h2List: string[];
  h3List: string[];
  metaDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  internalLinks: LinkData[];
  externalLinks: LinkData[];
  jsonLd: unknown[];
  microdata: { itemtype: string; properties: Record<string, string> }[];
  navLinks: NavLink[];
  contentPreview: string;
  wordCount: number;
  errorMessage: string;
}

/** PageDataのデフォルト値を生成 */
export function createPageData(url: string): PageData {
  return {
    url,
    status: "pending",
    httpStatus: null,
    title: "",
    h1: "",
    h2List: [],
    h3List: [],
    metaDescription: "",
    canonicalUrl: "",
    ogTitle: "",
    ogDescription: "",
    internalLinks: [],
    externalLinks: [],
    jsonLd: [],
    microdata: [],
    navLinks: [],
    contentPreview: "",
    wordCount: 0,
    errorMessage: "",
  };
}

// --------------------------------------------------------
// URLユーティリティ
// --------------------------------------------------------

/**
 * urljoin相当: ベースURLと相対パスを結合する
 */
function urljoin(base: string, path: string): string {
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

/**
 * URLからドメインを取得する
 */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// --------------------------------------------------------
// HTMLパーサー
// --------------------------------------------------------

export class HTMLParser {
  private $: cheerio.CheerioAPI;
  private baseUrl: string;
  private domain: string;

  constructor(html: string, baseUrl: string) {
    this.$ = cheerio.load(html);
    this.baseUrl = baseUrl;
    this.domain = getDomain(baseUrl);
  }

  getTitle(): string {
    const tag = this.$("title");
    return tag.length ? tag.text().trim() : "";
  }

  getH1(): string {
    const tag = this.$("h1").first();
    return tag.length ? tag.text().trim() : "";
  }

  getHList(level: number): string[] {
    const results: string[] = [];
    this.$(`h${level}`).each((_, el) => {
      const text = this.$(el).text().trim();
      if (text) {
        results.push(text);
      }
    });
    return results;
  }

  getMetaDescription(): string {
    const tag = this.$('meta[name="description"]');
    return tag.length ? (tag.attr("content") || "").trim() : "";
  }

  getCanonical(): string {
    const tag = this.$('link[rel="canonical"]');
    return tag.length ? (tag.attr("href") || "").trim() : "";
  }

  getOgTitle(): string {
    const tag = this.$('meta[property="og:title"]');
    return tag.length ? (tag.attr("content") || "").trim() : "";
  }

  getOgDescription(): string {
    const tag = this.$('meta[property="og:description"]');
    return tag.length ? (tag.attr("content") || "").trim() : "";
  }

  /** 同一ドメインのリンクを取得 */
  getInternalLinks(): LinkData[] {
    const links: LinkData[] = [];
    const seen = new Set<string>();

    this.$("a[href]").each((_, el) => {
      const href = (this.$(el).attr("href") || "").trim();
      if (
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:")
      ) {
        return;
      }
      const fullUrl = urljoin(this.baseUrl, href);
      const parsedDomain = getDomain(fullUrl);
      if (parsedDomain === this.domain && !seen.has(fullUrl)) {
        seen.add(fullUrl);
        links.push({
          url: fullUrl,
          text: this.$(el).text().trim().slice(0, 100),
        });
      }
    });
    return links;
  }

  /** 外部ドメインのリンクを取得 */
  getExternalLinks(): LinkData[] {
    const links: LinkData[] = [];

    this.$("a[href]").each((_, el) => {
      const href = (this.$(el).attr("href") || "").trim();
      if (href.startsWith("http")) {
        const parsedDomain = getDomain(href);
        if (parsedDomain !== this.domain) {
          links.push({
            url: href,
            text: this.$(el).text().trim().slice(0, 100),
          });
        }
      }
    });
    return links;
  }

  /** JSON-LD構造化データを抽出 */
  getJsonLd(): unknown[] {
    const results: unknown[] = [];
    this.$('script[type="application/ld+json"]').each((_, el) => {
      const raw = this.$(el).html() || "";
      if (!raw.trim()) return;
      try {
        const data = JSON.parse(raw);
        results.push(data);
      } catch {
        // 不正なJSONはスキップ
        if (raw.trim()) {
          results.push({ _raw: raw.trim(), _parseError: true });
        }
      }
    });
    return results;
  }

  /** Microdataを抽出 */
  getMicrodata(): { itemtype: string; properties: Record<string, string> }[] {
    const items: { itemtype: string; properties: Record<string, string> }[] =
      [];

    this.$("[itemscope]").each((_, el) => {
      const item: { itemtype: string; properties: Record<string, string> } = {
        itemtype: this.$(el).attr("itemtype") || "",
        properties: {},
      };

      this.$(el)
        .find("[itemprop]")
        .each((_, propEl) => {
          const name = this.$(propEl).attr("itemprop") || "";
          const value =
            this.$(propEl).attr("content") ||
            this.$(propEl).attr("href") ||
            this.$(propEl).attr("src") ||
            this.$(propEl).text().trim();
          if (name) {
            item.properties[name] = value;
          }
        });

      if (item.itemtype || Object.keys(item.properties).length > 0) {
        items.push(item);
      }
    });
    return items;
  }

  /** ナビゲーションメニューのリンクを取得 */
  getNavLinks(): NavLink[] {
    const navLinks: NavLink[] = [];

    this.$("nav, header")
      .find("a[href]")
      .each((_, el) => {
        const text = this.$(el).text().trim();
        const href = this.$(el).attr("href") || "";
        if (text) {
          navLinks.push({
            text,
            href: urljoin(this.baseUrl, href),
          });
        }
      });
    return navLinks;
  }

  /** 本文の冒頭テキストを取得（ナビ・フッター除く） */
  getContentPreview(chars: number = 300): string {
    // クローンしてスクリプト等を除去
    const $clone = cheerio.load(this.$.html() || "");
    $clone("script, style, nav, header, footer, aside").remove();

    const main =
      $clone("main").length > 0
        ? $clone("main")
        : $clone("article").length > 0
          ? $clone("article")
          : $clone("body");

    if (!main.length) return "";

    const text = main.text().replace(/\s+/g, " ").trim();
    return text.slice(0, chars);
  }

  /** 本文の文字数（日本語対応） */
  getWordCount(): number {
    // クローンしてスクリプト等を除去
    const $clone = cheerio.load(this.$.html() || "");
    $clone("script, style, nav, header, footer").remove();

    const text = $clone.text();
    // 日本語: 文字数、英語: 単語数
    return text.replace(/\s+/g, "").length;
  }

  /** すべての情報を一括取得 */
  parseAll(): Omit<
    PageData,
    "url" | "status" | "httpStatus" | "errorMessage"
  > {
    return {
      title: this.getTitle(),
      h1: this.getH1(),
      h2List: this.getHList(2),
      h3List: this.getHList(3),
      metaDescription: this.getMetaDescription(),
      canonicalUrl: this.getCanonical(),
      ogTitle: this.getOgTitle(),
      ogDescription: this.getOgDescription(),
      internalLinks: this.getInternalLinks(),
      externalLinks: this.getExternalLinks(),
      jsonLd: this.getJsonLd(),
      microdata: this.getMicrodata(),
      navLinks: this.getNavLinks(),
      contentPreview: this.getContentPreview(),
      wordCount: this.getWordCount(),
    };
  }
}

// --------------------------------------------------------
// フェッチャー
// --------------------------------------------------------

export class PageFetcher {
  static readonly DEFAULT_HEADERS: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  private maxRetries = 3;
  private retryWait = 30_000; // ミリ秒
  private timeout = 15_000; // ミリ秒

  /**
   * URLのページデータを取得して返す
   */
  async fetch(url: string): Promise<PageData> {
    const page = createPageData(url);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.timeout,
        );

        const resp = await fetch(url, {
          headers: PageFetcher.DEFAULT_HEADERS,
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeoutId);
        page.httpStatus = resp.status;

        if (resp.status === 200) {
          const html = await resp.text();
          const parser = new HTMLParser(html, url);
          const parsed = parser.parseAll();
          Object.assign(page, parsed);
          page.status = "success";
          return page;
        } else if (resp.status === 403 || resp.status === 401) {
          page.status = "blocked";
          page.errorMessage = `HTTP ${resp.status} - アクセス制限`;
          return page;
        } else if (resp.status === 404) {
          page.status = "error";
          page.errorMessage = "HTTP 404 - ページ非存在";
          return page;
        } else {
          page.errorMessage = `HTTP ${resp.status}`;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          page.status = "timeout";
          page.errorMessage = `タイムアウト（試行${attempt}/${this.maxRetries}）`;
        } else if (
          error instanceof TypeError &&
          String(error).includes("fetch")
        ) {
          page.status = "error";
          page.errorMessage = `接続エラー: ${error}`;
        } else {
          page.status = "error";
          page.errorMessage = `不明なエラー: ${error}`;
        }
      }

      if (attempt < this.maxRetries) {
        await this.sleep(this.retryWait);
      }
    }

    page.status = "error";
    return page;
  }

  /**
   * サイトマップからURLリストを取得
   */
  async fetchSitemap(baseUrl: string): Promise<string[]> {
    const sitemapCandidates = [
      urljoin(baseUrl, "/sitemap.xml"),
      urljoin(baseUrl, "/sitemap_index.xml"),
      urljoin(baseUrl, "/sitemap/"),
    ];

    for (const sitemapUrl of sitemapCandidates) {
      try {
        const resp = await fetch(sitemapUrl, {
          headers: PageFetcher.DEFAULT_HEADERS,
          signal: AbortSignal.timeout(10_000),
        });
        if (resp.status === 200) {
          const text = await resp.text();
          const $ = cheerio.load(text, { xmlMode: true });
          const urls: string[] = [];
          $("loc").each((_, el) => {
            urls.push($(el).text());
          });
          if (urls.length > 0) {
            return urls;
          }
        }
      } catch {
        continue;
      }
    }

    // robots.txt からサイトマップURLを探す
    try {
      const robotsUrl = urljoin(baseUrl, "/robots.txt");
      const resp = await fetch(robotsUrl, {
        headers: PageFetcher.DEFAULT_HEADERS,
        signal: AbortSignal.timeout(10_000),
      });
      if (resp.status === 200) {
        const text = await resp.text();
        for (const line of text.split("\n")) {
          if (line.toLowerCase().startsWith("sitemap:")) {
            const sitemapUrl = line.split(":").slice(1).join(":").trim();
            const resp2 = await fetch(sitemapUrl, {
              headers: PageFetcher.DEFAULT_HEADERS,
              signal: AbortSignal.timeout(10_000),
            });
            if (resp2.status === 200) {
              const text2 = await resp2.text();
              const $ = cheerio.load(text2, { xmlMode: true });
              const urls: string[] = [];
              $("loc").each((_, el) => {
                urls.push($(el).text());
              });
              if (urls.length > 0) {
                return urls;
              }
            }
          }
        }
      }
    } catch {
      // robots.txt の取得失敗は無視
    }

    return [];
  }

  /**
   * 複数URLを順番に取得
   */
  async fetchMultiple(
    urls: string[],
    delay: number = 1000,
  ): Promise<PageData[]> {
    const results: PageData[] = [];

    for (let i = 0; i < urls.length; i++) {
      console.log(`[${i + 1}/${urls.length}] 取得中: ${urls[i]}`);
      const result = await this.fetch(urls[i]);
      results.push(result);
      if (i < urls.length - 1) {
        await this.sleep(delay);
      }
    }

    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
