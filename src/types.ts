export interface StoredFile {
  file_name: string
  file_size: number
  mime_type: string
}

export interface Recognition {
  file_type: string
  video_id: number
  todbv_id?: number
  video_title: string
  video_type: 'tv' | 'movie'
  date_air?: string | null
  video_season_title?: string
  video_season_number?: number
  video_episode_id?: number
  video_episode_title?: string
  video_episode_date_air?: string | null
  video_episode_number?: number
  item_type: string
  item_id: number
}

export type FileStatus = 'pending' | 'recognizing' | 'success' | 'error' | 'archiving' | 'archived' | 'archive-error' | 'skipped'

export interface FileEntry extends StoredFile {
  recognition?: Recognition
  status: FileStatus
  error?: string
  manualId?: string
  skipReason?: string
  cached: boolean
}

export interface LogEntry {
  time: string
  message: string
  level: 'info' | 'success' | 'error' | 'warn'
}
