#!/usr/bin/env python3
"""
リードスクレイピングツール（ローカル実行用）
パターン④の拡張: ブラウザ自動化でより多くのリードを収集

使い方:
  pip install requests beautifulsoup4
  python scripts/lead-scraper.py --keyword "Web制作会社" --region "東京" --output leads.csv

オプション:
  --keyword   検索キーワード（必須）
  --region    地域（任意）
  --industry  業種（任意）
  --limit     取得上限（デフォルト: 30）
  --output    出力ファイル（デフォルト: leads.csv）
  --api-url   AIOサーバーURL（指定するとAPIに直接インポート）
"""

import argparse
import csv
import json
import sys
import time
import urllib.parse
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("必要なライブラリをインストールしてください:")
    print("  pip install requests beautifulsoup4")
    sys.exit(1)

# 除外ドメイン
EXCLUDED_DOMAINS = {
    "google.com", "google.co.jp", "facebook.com", "twitter.com",
    "instagram.com", "youtube.com", "linkedin.com", "wikipedia.org",
    "amazon.co.jp", "amazon.com", "yahoo.co.jp", "rakuten.co.jp",
    "tabelog.com", "hotpepper.jp", "gnavi.co.jp", "suumo.jp",
    "indeed.com", "en-japan.com", "recruit.co.jp", "mynavi.jp",
    "github.com", "qiita.com", "note.com", "zenn.dev",
    "x.com", "tiktok.com", "pinterest.com",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ja,en;q=0.9",
}


def is_company_url(url: str) -> bool:
    """企業サイトURLかどうかを判定"""
    try:
        host = urllib.parse.urlparse(url).hostname
        if not host:
            return False
        host = host.lstrip("www.")
        for excluded in EXCLUDED_DOMAINS:
            if host == excluded or host.endswith(f".{excluded}"):
                return False
        # 日本の企業ドメインを優先
        if any(host.endswith(ext) for ext in [".co.jp", ".or.jp", ".ne.jp", ".jp", ".com"]):
            return True
        return False
    except Exception:
        return False


def normalize_url(url: str) -> str:
    """URLを正規化"""
    url = url.strip()
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url.rstrip("/")


def domain_to_company(url: str) -> str:
    """URLからドメイン名を会社名として推定"""
    try:
        host = urllib.parse.urlparse(url).hostname
        return host.lstrip("www.").split(".")[0] if host else url
    except Exception:
        return url


def scrape_google(keyword: str, region: str = "", limit: int = 30) -> list[dict]:
    """Google検索からリードを収集"""
    results = []
    seen_urls = set()
    query = f"{keyword} {region} 公式サイト".strip()

    print(f"[Google検索] キーワード: '{query}'")

    for start in range(0, min(limit, 50), 10):
        url = f"https://www.google.co.jp/search?q={urllib.parse.quote(query)}&start={start}&hl=ja&num=10"

        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            if res.status_code != 200:
                print(f"  [!] HTTP {res.status_code} - 停止")
                break

            soup = BeautifulSoup(res.text, "html.parser")

            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"]
                # Google の /url?q= 形式
                if "/url?q=" in href:
                    match_url = urllib.parse.parse_qs(
                        urllib.parse.urlparse(href).query
                    ).get("q", [None])[0]
                    if match_url:
                        href = match_url
                elif not href.startswith("http"):
                    continue

                normalized = normalize_url(href)
                if not normalized or normalized in seen_urls or not is_company_url(normalized):
                    continue

                seen_urls.add(normalized)
                title = a_tag.get_text(strip=True)
                company = title.split(" - ")[0].split(" | ")[0].split(" – ")[0].strip()[:100] if title else domain_to_company(normalized)

                results.append({
                    "company": company,
                    "url": normalized,
                    "source": "Google検索",
                })

                if len(results) >= limit:
                    break

        except requests.RequestException as e:
            print(f"  [!] リクエストエラー: {e}")
            break

        if len(results) >= limit:
            break

        # レート制限回避
        print(f"  ... {len(results)}件取得済み")
        time.sleep(3)

    return results


def scrape_directory(directory_url: str) -> list[dict]:
    """ディレクトリページからリードを収集"""
    results = []
    seen_urls = set()

    print(f"[ディレクトリ] URL: {directory_url}")

    try:
        base_host = urllib.parse.urlparse(directory_url).hostname
        res = requests.get(directory_url, headers=HEADERS, timeout=15)
        if res.status_code != 200:
            print(f"  [!] HTTP {res.status_code}")
            return results

        soup = BeautifulSoup(res.text, "html.parser")

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if not href.startswith("http"):
                continue

            try:
                link_host = urllib.parse.urlparse(href).hostname
                if link_host == base_host:
                    continue
            except Exception:
                continue

            normalized = normalize_url(href)
            if not normalized or normalized in seen_urls or not is_company_url(normalized):
                continue

            seen_urls.add(normalized)
            text = a_tag.get_text(strip=True)[:100]

            results.append({
                "company": text or domain_to_company(normalized),
                "url": normalized,
                "source": f"ディレクトリ: {base_host}",
            })

    except requests.RequestException as e:
        print(f"  [!] リクエストエラー: {e}")

    print(f"  -> {len(results)}件取得")
    return results


def save_csv(results: list[dict], output_path: str):
    """結果をCSV出力"""
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["company", "url", "source"])
        writer.writeheader()
        writer.writerows(results)
    print(f"\n[CSV出力] {output_path} ({len(results)}件)")


def import_to_api(results: list[dict], api_url: str):
    """AIOサーバーのAPIにインポート"""
    urls_text = "\n".join(r["url"] for r in results)
    print(f"\n[API連携] {api_url}/api/research/import にインポート中...")

    try:
        res = requests.post(
            f"{api_url}/api/research/import",
            json={"content": urls_text, "format": "text"},
            headers={"Content-Type": "application/json"},
            timeout=60,
        )
        if res.status_code == 200:
            data = res.json()
            summary = data.get("summary", {})
            print(f"  -> 追加: {summary.get('inserted', 0)}件")
            print(f"  -> 重複スキップ: {summary.get('duplicateSkipped', 0)}件")
        else:
            print(f"  [!] APIエラー: {res.status_code} - {res.text[:200]}")
    except requests.RequestException as e:
        print(f"  [!] 接続エラー: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="リードスクレイピングツール - AIO Insight",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  # Google検索で東京のWeb制作会社を30件取得
  python lead-scraper.py --keyword "Web制作会社" --region "東京"

  # ディレクトリページからURLを抽出
  python lead-scraper.py --keyword "IT企業" --directory "https://example.com/company-list"

  # 取得したリードをAIOサーバーに直接インポート
  python lead-scraper.py --keyword "税理士事務所" --region "大阪" --api-url "https://your-app.vercel.app"
        """,
    )
    parser.add_argument("--keyword", required=True, help="検索キーワード")
    parser.add_argument("--region", default="", help="地域")
    parser.add_argument("--industry", default="", help="業種")
    parser.add_argument("--limit", type=int, default=30, help="取得上限 (デフォルト: 30)")
    parser.add_argument("--output", default="leads.csv", help="CSV出力先 (デフォルト: leads.csv)")
    parser.add_argument("--directory", nargs="*", default=[], help="スクレイピング対象のディレクトリURL")
    parser.add_argument("--api-url", default="", help="AIOサーバーURL（指定するとAPIに直接インポート）")

    args = parser.parse_args()

    print("=" * 50)
    print(" AIO Insight - リードスクレイピングツール")
    print("=" * 50)

    all_results = []
    seen_urls = set()

    # Google検索スクレイピング
    query_parts = [args.keyword]
    if args.industry:
        query_parts.append(args.industry)
    google_results = scrape_google(
        " ".join(query_parts),
        args.region,
        args.limit,
    )
    for r in google_results:
        if r["url"] not in seen_urls:
            seen_urls.add(r["url"])
            all_results.append(r)

    # ディレクトリスクレイピング
    for dir_url in args.directory:
        dir_results = scrape_directory(dir_url)
        for r in dir_results:
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                all_results.append(r)
        time.sleep(2)

    print(f"\n合計: {len(all_results)}件のリードを取得")

    if not all_results:
        print("[!] リードが見つかりませんでした")
        return

    # CSV出力
    save_csv(all_results, args.output)

    # API連携（オプション）
    if args.api_url:
        import_to_api(all_results, args.api_url.rstrip("/"))

    print("\n完了!")


if __name__ == "__main__":
    main()
