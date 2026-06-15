import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";

interface SeriesInfo {
  series: string;
  count: number;
}

export function getUniqueSeries(
  posts: CollectionEntry<"posts">[]
): SeriesInfo[] {
  const seriesMap = new Map<string, number>();

  posts.filter(postFilter).forEach(post => {
    const s = post.data.series;
    if (s) {
      seriesMap.set(s, (seriesMap.get(s) ?? 0) + 1);
    }
  });

  return Array.from(seriesMap, ([series, count]) => ({ series, count })).sort(
    (a, b) => a.series.localeCompare(b.series)
  );
}
