import partial from '../../styles/partials.module.css'
import type { Entry } from '../../api/types'
import { formatTime } from '../../lib/dates'
import { segmentContent } from '../../lib/tagParser'
import TagChip from '../TagChip'
import EntryAttachments from './EntryAttachments'
import TagInline from './TagInline'
import styles from './EntryCard.module.css'

type Props = {
  entry: Entry
  selected?: boolean
  onSelect?: () => void
}

/**
 * A single entry in the feed. Glass-canvas surface with a left-rail
 * timestamp, inline tag highlights, and a row of tag chips underneath.
 * Ported from the Stitch "Final Browser View" entry card markup.
 */
export default function EntryCard({ entry, selected = false, onSelect }: Props) {
  const segments = segmentContent(entry.content)
  const images = entry.images ?? []
  const hasText = entry.content.trim().length > 0
  const rootClass =
    `${partial.glassCanvas} ${partial.innerGlow} ${styles.card} ` +
    `${selected ? styles.selected : ''}`

  return (
    <article
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (!onSelect) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={rootClass}
      data-source={entry.source}
      aria-pressed={onSelect ? selected : undefined}
    >
      <div className={styles.rail}>
        <span className={`${partial.labelCaps} ${styles.time}`}>
          {formatTime(entry.created_at)}
        </span>
      </div>

      <div className={styles.body}>
        {hasText && (
          <p className={`${partial.bodyMd} ${styles.content}`}>
            {segments.map((seg, i) =>
              seg.kind === 'text' ? (
                <span key={i}>{seg.text}</span>
              ) : (
                <TagInline key={i} tag={seg.tag} />
              ),
            )}
          </p>
        )}
        {images.length > 0 && (
          <div className={styles.attachments}>
            <EntryAttachments images={images} variant="card" />
          </div>
        )}
        {entry.tags.length > 0 && (
          <div
            className={styles.chips}
            onClick={(e) => e.stopPropagation()}
          >
            {entry.tags.map((t) => (
              <TagChip key={t} tag={t} />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
