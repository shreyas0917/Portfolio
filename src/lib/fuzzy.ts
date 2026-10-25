/*
  Fuzzy matching for the command palette. Each word of the query must appear
  in order (not necessarily adjacent) in the command's title or keywords.
  Matches at word starts and consecutive runs score higher, so "rl" ranks
  "redis lock" above "url", and "lnk" still finds "LinkedIn".
*/

interface TokenMatch {
  score: number
  indices: number[]
}

const BOUNDARY = /[\s\-_/.:#&()]/
const isWordStart = (text: string, i: number) =>
  i === 0 || BOUNDARY.test(text[i - 1]) || (text[i - 1] === text[i - 1].toLowerCase() && text[i] !== text[i].toLowerCase())

function matchToken(token: string, text: string): TokenMatch | null {
  const lower = text.toLowerCase()
  let best: TokenMatch | null = null
  // Try every place the first character occurs; keep the best-scoring run.
  for (let start = lower.indexOf(token[0]); start !== -1; start = lower.indexOf(token[0], start + 1)) {
    const indices = [start]
    let score = 1 + (isWordStart(text, start) ? 6 : 0) - Math.min(start, 20) * 0.05
    let at = start
    for (let k = 1; k < token.length; k++) {
      const next = lower.indexOf(token[k], at + 1)
      if (next === -1) {
        score = -Infinity
        break
      }
      score += 1 + (next === at + 1 ? 4 : 0) + (isWordStart(text, next) ? 5 : 0) - Math.min(next - at - 1, 10) * 0.2
      indices.push(next)
      at = next
    }
    if (score > (best?.score ?? -Infinity)) best = { score, indices }
  }
  return best && best.score > -Infinity ? best : null
}

export interface FuzzyResult {
  score: number
  /** Matched character positions in the title, for highlighting. */
  hits: number[]
}

/** Scores `query` against a title and extra keywords; null when any query word doesn't match. */
export function fuzzy(query: string, title: string, keywords = ''): FuzzyResult | null {
  const tokens = query.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { score: 0, hits: [] }
  let score = 0
  const hits = new Set<number>()
  for (const token of tokens.map((t) => t.toLowerCase())) {
    const inTitle = matchToken(token, title)
    const inKeywords = matchToken(token, keywords)
    if (inTitle && (!inKeywords || inTitle.score >= inKeywords.score * 0.8)) {
      score += inTitle.score
      inTitle.indices.forEach((i) => hits.add(i))
    } else if (inKeywords) {
      score += inKeywords.score * 0.8
    } else {
      return null
    }
  }
  return { score, hits: [...hits].sort((a, b) => a - b) }
}
