/*
 * Tag parsing + display normalization.
 *
 * Input grammar — authoritative, mirrors `api/_tags.php::parse_tags` (SPEC §7.1):
 *   /work       → "work"
 *   /dev-ops    → "dev-ops"
 *   /1hour      → ∅  (must start with a letter)
 *   /work!      → "work"   (trailing punctuation ignored)
 *   not/atag    → ∅  (must follow whitespace or start-of-string)
 *
 * Display normalization — UI-only transform applied everywhere tags are
 * rendered to the user:
 *   stored tag  "work"    → displayed "#work"
 *   raw segment "/flow"   → rendered   "#flow"
 *
 * Tags are persisted server-side as lowercased bare strings (no prefix),
 * so the display prefix is added exclusively by `displayTag()` / the
 * inline/chip partials. This gives us a single, reversible rule:
 *     server ↔ client:   bare ("work")
 *     client → human:    `#` + bare ("#work")
 *     human → input:     `/` + bare ("/work")
 *
 * Anything that needs a clickable tag should round-trip through `tagRoute()`
 * so deep links stay encoded the same way everywhere in the app.
 */

const TAG_RE = /(?<=^|\s)\/([a-zA-Z][a-zA-Z0-9\-_]*)/g

export type ContentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'tag'; tag: string; raw: string; display: string }

/**
 * Extract the ordered, de-duplicated list of tag names (bare, lowercased)
 * from a raw entry body. Mirrors the server's `parse_tags`.
 */
export function parseTags(content: string): string[] {
  if (!content) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of content.matchAll(TAG_RE)) {
    const t = normalizeTag(m[1])
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/**
 * Split a raw entry body into alternating text + tag segments so the UI
 * can render inline highlights without losing the surrounding prose.
 */
export function segmentContent(content: string): ContentSegment[] {
  if (!content) return []
  const segs: ContentSegment[] = []
  let last = 0
  for (const m of content.matchAll(TAG_RE)) {
    const idx = m.index ?? 0
    if (idx > last) segs.push({ kind: 'text', text: content.slice(last, idx) })
    const tag = normalizeTag(m[1])
    if (tag) {
      segs.push({ kind: 'tag', tag, raw: m[0], display: displayTag(tag) })
    } else if (m[0]) {
      segs.push({ kind: 'text', text: m[0] })
    }
    last = idx + m[0].length
  }
  if (last < content.length) segs.push({ kind: 'text', text: content.slice(last) })
  return segs
}

/** Lowercase + trim a bare tag string. Empty / invalid input returns `''`. */
export function normalizeTag(tag: string): string {
  if (!tag) return ''
  const stripped = tag.replace(/^[#/]+/, '').trim()
  if (!stripped) return ''
  if (!/^[a-zA-Z][a-zA-Z0-9\-_]*$/.test(stripped)) return ''
  return stripped.toLowerCase()
}

/** Canonical user-facing rendering of a bare tag: always prefixed with `#`. */
export function displayTag(tag: string): string {
  const n = normalizeTag(tag)
  return n ? `#${n}` : ''
}

/** Canonical input-grammar rendering: always prefixed with `/`. */
export function inputTag(tag: string): string {
  const n = normalizeTag(tag)
  return n ? `/${n}` : ''
}

/** Route-safe path for a tag-filtered browser view. */
export function tagRoute(tag: string): string {
  const n = normalizeTag(tag)
  return n ? `/tag/${encodeURIComponent(n)}` : '/all'
}

/**
 * Swap every `/tag` occurrence in `content` for `#tag` without touching
 * the surrounding prose. Useful for copy-to-clipboard and export flows
 * where the display form is what the user expects.
 */
export function toDisplayContent(content: string): string {
  return content.replace(TAG_RE, (_match, raw) => {
    const t = normalizeTag(raw)
    return t ? `#${t}` : _match
  })
}

/**
 * Deterministic color variant for a given tag so `#design-system` always
 * paints the same hue across the chip, the inline highlight, and the
 * side-nav dot.
 */
export const TAG_VARIANTS = [
  'blue',
  'amber',
  'emerald',
  'purple',
  'rose',
  'cyan',
  'slate',
] as const
export type TagVariant = (typeof TAG_VARIANTS)[number]

export function tagVariant(tag: string): TagVariant {
  const n = normalizeTag(tag)
  if (!n) return 'slate'
  let h = 0
  for (let i = 0; i < n.length; i += 1) {
    h = (h * 31 + n.charCodeAt(i)) >>> 0
  }
  return TAG_VARIANTS[h % TAG_VARIANTS.length]
}
