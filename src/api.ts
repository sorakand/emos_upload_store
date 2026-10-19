import { HTTPError } from 'ky'
import ky from '@/utils/ky'
import type { Recognition, StoredFile } from '@/types'

export interface CurrentUser {
  user_id: string
  username: string
  avatar: string | null
}

export const api = {
  user: () => ky.get('api/user/base').json<CurrentUser>(),
  disks: () => ky.get('api/upload/store/disk').json<string[]>(),
  files: (path: string) =>
    ky
      .get('api/upload/store/file', {
        searchParams: { path_type: path },
      })
      .json<StoredFile[]>(),
  recognize: (fileName: string) =>
    ky
      .get('api/upload/video/recognize', {
        searchParams: { file_name: fileName, provider: 'binary' },
      })
      .json<Recognition>(),
  archive: (data: ArchiveRequest) =>
    ky
      .post('api/upload/store/archive', {
        json: data,
      })
      .json<ArchiveResponse>(),
}

export interface ArchiveRequest {
  item_type: string
  item_id: number
  path_type: string
  file_name: string
}

export interface ArchiveResponse {
  media_id: string
  carrot: number
}

export async function getErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    try {
      const body: unknown = await error.response.clone().json()
      if (isRecord(body) && typeof body.message === 'string' && body.message) return body.message
    } catch {
      // Fall back to ky's request message when the response is not JSON.
    }
  }

  return error instanceof Error ? error.message : '请求失败'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
