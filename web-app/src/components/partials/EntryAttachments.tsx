import { API_BASE } from '../../api/client'
import type { EntryImage } from '../../api/types'
import styles from './EntryAttachments.module.css'

type Props = {
  images: EntryImage[]
  variant: 'card' | 'detail'
}

/**
 * Screenshot and attachment tiles — below body text, above tags
 * (Stitch Web-App: Browser / Final Browser entry pattern).
 */
export default function EntryAttachments({ images, variant }: Props) {
  if (images.length === 0) return null

  const listClass =
    variant === 'card' ? styles.strip : `${styles.strip} ${styles.detailList}`

  return (
    <ul className={listClass} aria-label="Entry attachments">
      {images.map((img) => {
        const src = `${API_BASE}/${img.url}`
        if (variant === 'card') {
          return (
            <li key={img.id} className={styles.cardFigure}>
              <img
                className={styles.cardImg}
                src={src}
                alt=""
                width={img.width ?? undefined}
                height={img.height ?? undefined}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </li>
          )
        }
        return (
          <li key={img.id} className={styles.detailFigure}>
            <img
              className={styles.detailImg}
              src={src}
              alt=""
              width={img.width ?? undefined}
              height={img.height ?? undefined}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </li>
        )
      })}
    </ul>
  )
}
