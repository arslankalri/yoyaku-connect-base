import { streamText } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { NAGI_MODEL } from "@/lib/nagi-brain.server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const LINK_HINT =
  /(menu|price|fee|faq|qa|q-a|access|about|shop|salon|store|info|course|service|メニュー|料金|価格|よくある|アクセス|店舗|概要)/i;

export type ImportedBusiness = {
  name: string | null;
  phone: string | null;
  postal_code: string | null;
  address: string | null;
  business_type: string | null;
  seat_capacity: number | null;
  hours: { day_of_week: number; is_open: boolean; open_time: string; close_time: string }[];
  services: { name: string; duration_minutes: number; price: number }[];
  faqs: { question: string; answer: string }[];
  missing: string[];
};

function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const h = u.hostname;
    if (h === "localhost" || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return null;
    return u;
  } catch {
    return null;
  }
}

async function fetchHtml(url: URL): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 600_000);
    return { html, finalUrl: res.url || url.toString() };
  } catch {
    return null;
  }
}

function meta(html: string, key: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  return re.exec(html)?.[1] ?? "";
}

function toText(html: string) {
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]!.trim())
    .join("\n");
  const body = html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? "";
  return `TITLE: ${title}\nDESCRIPTION: ${meta(html, "description") || meta(html, "og:description")}\n${ld ? `STRUCTURED DATA:\n${ld.slice(0, 8000)}\n` : ""}${body}`;
}

/** Known Japanese portals: their menu/coupon/access pages hold the most accurate structured data. */
function portalPages(u: URL): string[] {
  const h = u.hostname;
  const root = (re: RegExp) => re.exec(u.pathname)?.[0];
  if (/beauty\.hotpepper\.jp$/.test(h)) {
    const r = root(/^\/(kr\/)?sln[A-Z0-9]+\//i);
    return r ? ["coupon/", "menu/", "staff/"].map((p) => new URL(r + p, u).toString()) : [];
  }
  if (/hotpepper\.jp$/.test(h)) {
    const r = root(/^\/str[A-Z0-9]+\//i);
    return r ? ["food/", "course/", "map/"].map((p) => new URL(r + p, u).toString()) : [];
  }
  if (/tabelog\.com$/.test(h)) {
    const r = root(/^\/[a-z]+\/A\d+\/A\d+\/\d+\//);
    return r ? ["dtlmenu/", "dtlmenu/drink/", "party/"].map((p) => new URL(r + p, u).toString()) : [];
  }
  if (/gnavi\.co\.jp$/.test(h)) {
    const r = root(/^\/[a-z0-9]+\//);
    return r ? ["menu/", "map/"].map((p) => new URL(r + p, u).toString()) : [];
  }
  return [];
}

async function readWebsite(start: URL) {
  const first = await fetchHtml(start);
  if (!first) return "";
  const parts = [`=== PAGE ${first.finalUrl} ===\n${toText(first.html).slice(0, 14000)}`];
  const base = new URL(first.finalUrl);
  const links = new Set<string>(portalPages(base));
  const limit = links.size > 0 ? links.size : 4;
  for (const m of links.size > 0 ? [] : first.html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const u = new URL(m[1]!, base);
      if (u.hostname !== base.hostname || u.toString() === base.toString()) continue;
      if (LINK_HINT.test(u.pathname + " " + m[2])) links.add(u.toString().split("#")[0]!);
    } catch {
      /* ignore bad link */
    }
    if (links.size >= limit) break;
  }
  const pages = await Promise.all([...links].map((l) => fetchHtml(new URL(l))));
  pages.forEach((p, i) => {
    if (p) parts.push(`=== PAGE ${[...links][i]} ===\n${toText(p.html).slice(0, 9000)}`);
  });
  return parts.join("\n\n").slice(0, 45000);
}

async function readMaps(url: URL) {
  const page = await fetchHtml(url);
  if (!page) return "";
  const final = decodeURIComponent(page.finalUrl);
  const placeName = /\/place\/([^/@]+)/.exec(final)?.[1]?.replace(/\+/g, " ") ?? "";
  return [
    `MAPS URL: ${final}`,
    placeName && `PLACE NAME: ${placeName}`,
    `TITLE: ${meta(page.html, "og:title")}`,
    `DESCRIPTION: ${meta(page.html, "og:description") || meta(page.html, "description")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const PROMPT = `You extract a Japanese small business profile from scraped web pages for an AI receptionist.
Return ONLY a JSON object (no markdown) with this exact shape:
{"name":string|null,"phone":string|null,"postal_code":string|null,"address":string|null,
"business_type":one of ["hair_salon","barber","beauty_salon","massage_spa","clinic","dental","restaurant","cafe","bar_izakaya","studio","pet_care","repair_service","other"]|null,
"seat_capacity":number|null,
"hours":[{"day_of_week":0-6 (0=Sunday),"is_open":boolean,"open_time":"HH:MM","close_time":"HH:MM"}],
"services":[{"name":string,"duration_minutes":number,"price":number}],
"faqs":[{"question":string,"answer":string}],
"missing":[string]}
Rules: Use only facts present in the source text — never invent. If hours are unknown return []. Include all 7 days when hours are known (closed days is_open=false, times "09:00"/"18:00").
Services: menu items / courses with prices in yen as integers; estimate duration_minutes only if stated, else 60 (30 for cafes/restaurants). Max 30 services.
FAQs: 5-12 helpful Q&A written in Japanese that customers phone about (parking, payment methods, access/nearest station, cancellation policy, reservations, kids/pets, etc.) — only from facts in the text.
"missing": short Japanese labels for important things not found (e.g. "営業時間","電話番号","料金","キャンセルポリシー","駐車場").`;

export async function extractBusiness(input: {
  websiteUrl?: string | undefined;
  mapsUrl?: string | undefined;
  images?: string[] | undefined;
}): Promise<ImportedBusiness> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");
  const site = input.websiteUrl ? safeUrl(input.websiteUrl) : null;
  const maps = input.mapsUrl ? safeUrl(input.mapsUrl) : null;
  const images = (input.images ?? []).filter((d) => /^data:image\/(png|jpe?g|webp);base64,/.test(d));
  if (!site && !maps && images.length === 0) throw new Error("INVALID_URL");

  const [siteText, mapsText] = await Promise.all([
    site ? readWebsite(site) : Promise.resolve(""),
    maps ? readMaps(maps) : Promise.resolve(""),
  ]);
  if (!siteText && !mapsText && images.length === 0) throw new Error("UNREACHABLE");

  const gateway = createLovableAiGatewayProvider(key);
  const text0 = `GOOGLE MAPS:\n${mapsText || "(none)"}\n\nWEBSITE:\n${siteText || "(none)"}${
    images.length ? `\n\nPHOTOS: ${images.length} attached (menus, price boards, flyers or shop cards) — read every price, hour and policy in them.` : ""
  }`;
  const result = streamText({
    model: gateway(NAGI_MODEL),
    system: PROMPT,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: text0 }, ...images.map((d) => ({ type: "image" as const, image: d }))],
      },
    ],
  });
  const text = await result.text;
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const raw = JSON.parse(json) as Partial<ImportedBusiness>;
  const time = (s: unknown) => (typeof s === "string" && /^\d{1,2}:\d{2}$/.test(s) ? s.padStart(5, "0") : null);
  return {
    name: raw.name || null,
    phone: raw.phone || null,
    postal_code: raw.postal_code || null,
    address: raw.address || null,
    business_type: raw.business_type || null,
    seat_capacity: Number(raw.seat_capacity) > 0 ? Math.floor(Number(raw.seat_capacity)) : null,
    hours: (raw.hours ?? [])
      .filter((h) => h.day_of_week >= 0 && h.day_of_week <= 6)
      .map((h) => ({
        day_of_week: h.day_of_week,
        is_open: !!h.is_open,
        open_time: time(h.open_time) ?? "09:00",
        close_time: time(h.close_time) ?? "18:00",
      })),
    services: (raw.services ?? [])
      .filter((s) => s.name?.trim())
      .slice(0, 30)
      .map((s) => ({
        name: s.name.trim().slice(0, 120),
        duration_minutes: Math.max(5, Math.round(Number(s.duration_minutes) || 60)),
        price: Math.max(0, Math.round(Number(s.price) || 0)),
      })),
    faqs: (raw.faqs ?? [])
      .filter((f) => f.question?.trim() && f.answer?.trim())
      .slice(0, 15),
    missing: (raw.missing ?? []).filter((m) => typeof m === "string").slice(0, 10),
  };
}
