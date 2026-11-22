export type Precision = "minute" | "day";

/** 접수 창. closeAt은 그 시각부터 마감(미포함 끝). 시각은 KST(+09:00). */
export type RegWindow = {
  openAt: string | null;
  closeAt: string | null;
  openPrecision?: Precision;
  closePrecision?: Precision;
};

export type Race = {
  id: string;
  name: string;
  date: string;
  weekday: string;
  place: string;
  distances: string[];
  extra?: string;
  window?: RegWindow;
  windows?: Record<string, RegWindow>;
  fees: string;
  note?: string;
  url: string;
  listingUrl?: string;
  sourceName: string;
  curated: boolean;
  /** 수집 결과와 겹치면 이 큐레이션 대회가 이긴다. */
  matchKeys?: string[];
  /** YYYY-MM-DD. 수집기가 처음 본 날, 또는 접수 시작일. */
  firstSeen: string;
  lastChecked: string;
  official: boolean;
};

export type ScrapedFile = {
  collectedAt: string | null;
  sources: Array<{ name: string; url: string; ok: boolean; races: number; note?: string }>;
  skipped: Array<{ name: string; reason: string }>;
  races: Race[];
};

export const FOCUS_DISTANCES = ["하프", "10km", "5km"] as const;

export const STATUS_ORDER = ["오픈 예정", "접수 중", "마감"] as const;
export type Status = (typeof STATUS_ORDER)[number];
