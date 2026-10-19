import { computed, ref } from 'vue'
import { useSessionStorage, useStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import { api, getErrorMessage } from '@/api'
import type { FileEntry, LogEntry, Recognition, StoredFile } from '@/types'

const recognitionConcurrency = 5
const recognitionCacheKey = 'emos_store_upload_recognition'

export function useUploadQueue() {
  const pathType = useStorage('emos_store_upload_path_type', '')
  const entries = ref<FileEntry[]>([])
  const logs = ref<LogEntry[]>([])
  const loadingFiles = ref(false)
  const archiving = ref(false)
  const archiveIndex = ref(0)
  const archiveTotal = ref(0)
  const recognitionCache = useSessionStorage<Record<string, Recognition>>(recognitionCacheKey, {})
  let loadSequence = 0

  const archiveable = computed(() => entries.value.filter((entry) => entry.status === 'success'))
  const recognizedCount = computed(() => entries.value.filter((entry) => ['success', 'error', 'skipped', 'archiving', 'archived', 'archive-error'].includes(entry.status)).length)
  const successCount = computed(() => entries.value.filter((entry) => ['success', 'archived'].includes(entry.status)).length)
  const failureCount = computed(() => entries.value.filter((entry) => ['error', 'archive-error'].includes(entry.status)).length)
  const skippedCount = computed(() => entries.value.filter((entry) => entry.status === 'skipped').length)
  const pendingCount = computed(() => entries.value.filter((entry) => ['pending', 'recognizing', 'archiving'].includes(entry.status)).length)
  const canArchive = computed(() => archiveable.value.length > 0 && !archiving.value)

  function log(message: string, level: LogEntry['level'] = 'info') {
    logs.value.unshift({ time: dayjs().format('HH:mm:ss'), message, level })
    if (logs.value.length > 200) logs.value.length = 200
  }

  async function recognizeOne(entry: FileEntry) {
    entry.status = 'recognizing'
    entry.cached = false
    entry.error = undefined

    try {
      const fileName = entry.manualId ? `[todbv_id=${entry.manualId}]${entry.file_name}` : entry.file_name
      const recognition = await api.recognize(fileName)
      recognitionCache.value[entry.file_name] = recognition
      entry.recognition = recognition
      entry.status = 'success'
      log(`识别成功：${entry.file_name}`, 'success')
    } catch (error) {
      entry.status = 'error'
      entry.error = await getErrorMessage(error)
      log(`识别失败：${entry.file_name}（${entry.error}）`, 'error')
    }
  }

  async function recognizePending() {
    const queue = entries.value.filter((entry) => entry.status === 'pending')
    let cursor = 0
    const worker = async () => {
      while (cursor < queue.length) {
        const entry = queue[cursor++]
        if (entry) await recognizeOne(entry)
      }
    }

    await Promise.all(Array.from({ length: Math.min(recognitionConcurrency, queue.length) }, worker))
    if (queue.length) log(`识别完成：${queue.length} 个文件`)
  }

  async function loadFiles() {
    const selectedPath = pathType.value
    if (!selectedPath) return

    const sequence = ++loadSequence
    loadingFiles.value = true
    try {
      const files = await api.files(selectedPath)
      if (sequence !== loadSequence || selectedPath !== pathType.value) return
      entries.value = createEntries(files, recognitionCache.value)
      log(`读取到 ${files.length} 个暂存文件`)
      await recognizePending()
    } catch (error) {
      if (sequence === loadSequence) log(`获取暂存文件失败：${await getErrorMessage(error)}`, 'error')
    } finally {
      if (sequence === loadSequence) loadingFiles.value = false
    }
  }

  async function recognize(entry: FileEntry) {
    if (entry.status === 'recognizing' || archiving.value) return
    await recognizeOne(entry)
  }

  async function archive() {
    if (!canArchive.value) return
    const selectedPath = pathType.value
    const queue = [...archiveable.value]
    archiving.value = true
    archiveIndex.value = 0
    archiveTotal.value = queue.length
    let hasFailure = false

    try {
      for (const entry of queue) {
        const recognition = entry.recognition
        if (!recognition) continue
        entry.status = 'archiving'
        try {
          await api.archive({
            item_type: recognition.item_type,
            item_id: recognition.item_id,
            path_type: selectedPath,
            file_name: entry.file_name,
          })
          entry.status = 'archived'
          log(`入库成功：${entry.file_name}`, 'success')
        } catch (error) {
          hasFailure = true
          entry.status = 'archive-error'
          entry.error = await getErrorMessage(error)
          log(`入库失败：${entry.file_name}（${entry.error}），继续处理下一个文件`, 'error')
        }
        archiveIndex.value++
      }

      entries.value = entries.value.filter((entry) => entry.status !== 'archived')
      log(hasFailure ? '本批入库完成，存在失败文件，请处理后重试' : '本批入库完成')
    } finally {
      archiving.value = false
    }

    if (!hasFailure) await loadFiles()
  }

  function clearLogs() {
    logs.value = []
  }

  return {
    pathType,
    entries,
    logs,
    loadingFiles,
    archiving,
    archiveIndex,
    archiveTotal,
    recognizedCount,
    successCount,
    failureCount,
    skippedCount,
    pendingCount,
    canArchive,
    loadFiles,
    recognize,
    archive,
    clearLogs,
  }
}

function createEntries(files: StoredFile[], cache: Record<string, Recognition>): FileEntry[] {
  const sidecars = new Set(files.filter((file) => file.file_name.endsWith('.aria2')).map((file) => file.file_name.slice(0, -'.aria2'.length)))
  const orderedFiles = [...files].sort((a, b) => {
    const aName = baseName(a.file_name)
    const bName = baseName(b.file_name)
    return aName.localeCompare(bName, 'zh-CN') || Number(a.file_name.endsWith('.aria2')) - Number(b.file_name.endsWith('.aria2'))
  })

  return orderedFiles.map((file) => {
    const downloading = file.file_name.endsWith('.aria2') || sidecars.has(file.file_name)
    const empty = file.file_size === 0
    const isVideo = file.mime_type.startsWith('video/')
    const cached = !downloading && !empty && isVideo ? cache[file.file_name] : undefined
    const skipReason = downloading ? '该文件存在 .aria2 下载标记，正在下载' : empty ? '文件大小为 0，暂不识别' : !isVideo ? '此文件不是视频文件，已跳过处理' : undefined

    return {
      ...file,
      cached: Boolean(cached),
      recognition: cached,
      status: skipReason ? 'skipped' : cached ? 'success' : 'pending',
      skipReason,
    }
  })
}

function baseName(fileName: string) {
  return fileName.endsWith('.aria2') ? fileName.slice(0, -'.aria2'.length) : fileName
}
