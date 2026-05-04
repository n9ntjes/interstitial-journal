import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import partial from '../../styles/partials.module.css'
import { createEntry } from '../../api/endpoints'
import { parseTags } from '../../lib/tagParser'
import TagChip from '../TagChip'
import Icon from './Icon'
import styles from './QuickPunchPill.module.css'

/**
 * Bottom-pinned floating composer pill. Honest-glass surface, auto-growing
 * textarea, `⌘/Ctrl + Enter` to submit, live tag chip preview.
 *
 * This component is intentionally self-contained so any route can drop it
 * in without owning its state.
 */
export default function QuickPunchPill() {
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (content: string) => createEntry({ content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['heatmap'] })
      setDraft('')
      textareaRef.current?.focus()
    },
  })

  const previewTags = parseTags(draft)
  const canSubmit = draft.trim().length > 0 && !mutation.isPending

  function submit() {
    if (!canSubmit) return
    mutation.mutate(draft.trim())
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className={styles.dock}>
      {previewTags.length > 0 && (
        <div className={styles.preview}>
          {previewTags.map((t) => (
            <TagChip key={t} tag={t} asLink={false} />
          ))}
        </div>
      )}
      <form
        className={`${partial.honestGlass} ${partial.innerGlow} ${styles.pill}`}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="What's on your mind? /tag"
          rows={1}
          className={`${partial.monoInput} ${styles.input}`}
          autoFocus
        />
        <button
          type="submit"
          className={styles.submit}
          disabled={!canSubmit}
          aria-label="Capture punch"
          title="Capture (⌘⏎)"
        >
          {mutation.isPending ? (
            <Icon name="progress_activity" size={18} />
          ) : (
            <Icon name="arrow_upward" size={18} weight={500} />
          )}
        </button>
      </form>
      {mutation.error && (
        <div className={styles.error}>{(mutation.error as Error).message}</div>
      )}
    </div>
  )
}
