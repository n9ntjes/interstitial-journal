/** Aligned with `web-app/src/api/types.ts` (entry + attachment responses). */

export type EntryImage = {
  id: number
  mime: string
  width: number | null
  height: number | null
  url: string
}

export type EntrySource = 'web' | 'tauri' | 'api'

export type Entry = {
  id: number
  created_at: string
  content: string
  source: EntrySource
  tags: string[]
  images: EntryImage[]
}

export type UploadImageResult = EntryImage

export type DeviceAuthDto = {
  token: string
  api_base: string
  user_email: string | null
}
