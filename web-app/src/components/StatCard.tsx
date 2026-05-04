import styles from './StatCard.module.css'

type Props = {
  label: string
  value: React.ReactNode
  hint?: string
}

export default function StatCard({ label, value, hint }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  )
}
