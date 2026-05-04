import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import partial from '../../styles/partials.module.css'
import { deleteEntry, getEntry, updateEntry } from '../../api/endpoints'
import { segmentContent, parseTags, toDisplayContent } from '../../lib/tagParser'
import { formatDayLabel, formatTime } from '../../lib/dates'
import TagChip from '../TagChip'
import TagInline from './TagInline'
import EntryAttachments from './EntryAttachments'
import IconButton from './IconButton'
import Icon from './Icon'
import styles from './EntryDetailPanel.module.css'

type Props = {
  entryId: number | null
  onClose: () => void
  onDeleted: (id: number) => void
}

/**
 * Right-column entry detail panel. Glass surface, sticky title block,
 * inline tag rendering, edit/delete/copy actions at the bottom.
 */
export default function EntryDetailPanel({ entryId, onClose, onDeleted }: Props) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['entry', entryId],
    queryFn: () => getEntry(entryId as number),
    enabled: entryId !== null,
  })

  // Derived-state reset without an effect: whenever the selected entry (or
  // the fetched content it resolves to) changes, snap the editor back to a
  // clean view of that entry. React recommends the "track previous props"
  // pattern over a useEffect that calls setState.
  const loadedContent = query.data?.entry.content ?? ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [signature, setSignature] = useState<string>(`${entryId ?? 'none'}::${loadedContent}`)
  const nextSignature = `${entryId ?? 'none'}::${loadedContent}`
  if (signature !== nextSignature) {
    setSignature(nextSignature)
    setEditing(false)
    setDraft(loadedContent)
  }

  const save = useMutation({
    mutationFn: (content: string) => updateEntry(entryId as number, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] })
      qc.invalidateQueries({ queryKey: ['entry', entryId] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setEditing(false)
    },
  })

  const del = useMutation({
    mutationFn: () => deleteEntry(entryId as number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['heatmap'] })
      if (entryId !== null) onDeleted(entryId)
    },
  })

  if (entryId === null) {
    return (
      <aside className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="description" size={32} />
          <p>Select an entry to view details</p>
        </div>
      </aside>
    )
  }

  if (query.isLoading) {
    return (
      <aside className={styles.panel}>
        <div className={styles.empty}>Loading…</div>
      </aside>
    )
  }

  if (query.error || !query.data) {
    return (
      <aside className={styles.panel}>
        <div className={styles.empty}>
          <h3>Couldn’t load entry</h3>
          <p>{(query.error as Error)?.message ?? 'Unknown error'}</p>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>
      </aside>
    )
  }

  const entry = query.data.entry
  const segments = segmentContent(entry.content)
  const previewTags = editing ? parseTags(draft) : entry.tags
  const attachmentImages = entry.images ?? []
  const titleLine = firstLineAsTitle(entry.content, attachmentImages.length > 0)

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <h3 className={styles.headerTitle}>Entry Detail</h3>
        <div className={styles.headerActions}>
          {editing ? (
            <>
              <IconButton
                icon="save"
                label="Save"
                onClick={() => save.mutate(draft.trim())}
                disabled={save.isPending || draft.trim() === '' || draft === entry.content}
              />
              <IconButton
                icon="close"
                label="Cancel"
                onClick={() => {
                  setDraft(entry.content)
                  setEditing(false)
                }}
              />
            </>
          ) : (
            <>
              <IconButton icon="edit" label="Edit" onClick={() => setEditing(true)} />
              <IconButton
                icon="content_copy"
                label="Copy"
                onClick={() => navigator.clipboard.writeText(toDisplayContent(entry.content))}
              />
              <IconButton
                icon="delete"
                label="Delete"
                disabled={del.isPending}
                onClick={() => {
                  if (confirm('Delete this entry? This cannot be undone.')) del.mutate()
                }}
              />
              <IconButton icon="close" label="Close" onClick={onClose} />
            </>
          )}
        </div>
      </header>

      <div className={`${partial.scrollbarHide} ${styles.body}`}>
        <div className={styles.meta}>
          <span className={`${partial.labelCapsWidest} ${styles.metaDate}`}>
            {formatDayLabel(entry.created_at.slice(0, 10))} · {formatTime(entry.created_at)} ·
            via {entry.source}
          </span>
          <h1 className={styles.title}>{titleLine}</h1>
        </div>

        {editing ? (
          <textarea
            className={`${partial.monoInput} ${styles.editor}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            autoFocus
          />
        ) : (
          <div className={`${partial.bodyMd} ${styles.content}`}>
            {segments.map((seg, i) =>
              seg.kind === 'text' ? (
                <span key={i}>{seg.text}</span>
              ) : (
                <TagInline key={i} tag={seg.tag} />
              ),
            )}
          </div>
        )}

        {attachmentImages.length > 0 && (
          <div className={styles.imageBlock}>
            <EntryAttachments images={attachmentImages} variant="detail" />
          </div>
        )}

        {previewTags.length > 0 && (
          <div className={styles.chips}>
            {previewTags.map((t) => (
              <TagChip key={t} tag={t} asLink={!editing} size="md" />
            ))}
          </div>
        )}

        {save.error && <div className={styles.error}>{(save.error as Error).message}</div>}
        {del.error && <div className={styles.error}>{(del.error as Error).message}</div>}
      </div>
    </aside>
  )
}

function firstLineAsTitle(content: string, hasImages: boolean): string {
  const firstLine = content.split('\n', 1)[0] ?? ''
  const cleaned = firstLine.replace(/\s+/g, ' ').trim()
  if (cleaned.length === 0) {
    return hasImages ? 'Screenshot' : 'Untitled entry'
  }
  if (cleaned.length <= 56) return cleaned
  return `${cleaned.slice(0, 53)}…`
}
