import { readFile } from "node:fs/promises";

const FEED_URL = "https://www.apple.com/jp/newsroom/rss-feed.rss";
const KEYWORDS = ["Mac", "MacBook", "iMac"];
const USER_AGENT =
  "macleap-lineup-check (+https://github.com/O6lvl4/macleap)";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
}

function decodeCdata(text: string): string {
  return text.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decodeCdata(m[1].trim()) : null;
}

function extractLinkHref(xml: string): string | null {
  const m = xml.match(/<link\b[^>]*\bhref="([^"]+)"[^>]*(?:\/>|>\s*<\/link>)/);
  return m ? m[1] : null;
}

function parseAtom(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const block = match[1];
    const title = extractTag(block, "title");
    const updated = extractTag(block, "updated");
    const link = extractLinkHref(block);
    if (!title || !updated || !link) continue;
    const dt = new Date(updated);
    if (Number.isNaN(dt.getTime())) continue;
    items.push({ title, link, pubDate: dt.toISOString() });
  }
  return items;
}

function isMacRelated(title: string): boolean {
  return KEYWORDS.some((kw) => title.includes(kw));
}

async function main(): Promise<void> {
  const lineupRaw = await readFile("data/lineup.json", "utf-8");
  const lineup = JSON.parse(lineupRaw) as { updatedAt: string };
  const since = new Date(lineup.updatedAt).getTime();

  const res = await fetch(FEED_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    process.stderr.write(`Failed to fetch ${FEED_URL}: ${res.status}\n`);
    process.exit(2);
  }
  const xml = await res.text();
  const items = parseAtom(xml);

  const newItems = items.filter(
    (it) => isMacRelated(it.title) && new Date(it.pubDate).getTime() > since,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        feedUrl: FEED_URL,
        lineupUpdatedAt: lineup.updatedAt,
        scannedAt: new Date().toISOString(),
        totalItems: items.length,
        newItems,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
