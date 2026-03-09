export function formatTmdbScore(score?: number | null) {
  if (score == null) {
    return "TMDB n/a";
  }

  return `${score.toFixed(1)}/10`;
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}
