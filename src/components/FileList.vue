<template>
  <section class="panel file-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">识别队列</p>
        <h2>
          暂存文件
          <span class="count">{{ entries.length }}</span>
        </h2>
      </div>
      <span class="secondary-copy">识别结果可手动修正后重新匹配</span>
    </div>

    <div v-if="!entries.length" class="empty-state">
      <span class="empty-symbol" aria-hidden="true">＋</span>
      <h3>暂存区为空</h3>
      <p>当前存储位置没有待处理文件</p>
    </div>

    <div v-else class="file-list">
      <article v-for="entry in entries" :key="entry.file_name" class="file-row" :class="`file-row-${entry.status}`">
        <div class="file-heading">
          <div class="file-identity">
            <span class="file-kind" :class="{ 'file-kind-video': isVideo(entry) }" aria-hidden="true">
              {{ isVideo(entry) ? '▶' : 'FILE' }}
            </span>
            <div class="file-name-block">
              <strong>{{ entry.file_name }}</strong>
              <span>
                {{ formatSize(entry.file_size) }}
                <i>·</i>
                {{ entry.mime_type }}
              </span>
            </div>
          </div>
          <span class="file-status" :class="`status-${entry.status}`">
            <i aria-hidden="true"></i>
            {{ statusText(entry) }}
          </span>
        </div>

        <div v-if="entry.recognition" class="recognition-result">
          <div class="recognition-copy">
            <div class="recognition-title">
              <span class="result-label">识别结果</span>
              <h3>{{ entry.recognition.video_title }}</h3>
              <small v-if="entry.recognition.video_type === 'tv' && entry.recognition.video_episode_title" class="episode-title">{{ entry.recognition.video_episode_title }}</small>
            </div>
            <dl class="metadata">
              <div>
                <dt>媒体类型</dt>
                <dd>{{ entry.recognition.video_type === 'tv' ? '电视剧' : '电影' }}</dd>
              </div>
              <div>
                <dt>上映日期</dt>
                <dd>{{ releaseDate(entry) }}</dd>
              </div>
              <div v-if="entry.recognition.video_type === 'tv'">
                <dt>季 / 集</dt>
                <dd>S{{ padNumber(entry.recognition.video_season_number) }}E{{ padNumber(entry.recognition.video_episode_number) }}</dd>
              </div>
            </dl>
          </div>

          <div class="recognition-actions">
            <label class="manual-id">
              <span class="sr-only">todbv_id</span>
              <input :value="manualIdValue(entry)" inputmode="numeric" placeholder="todbv_id" :disabled="busy || entry.status === 'recognizing'" @input="setManualId(entry, $event)" />
              <button v-if="entry.manualId" type="button" class="icon-button clear-id" aria-label="清空 todbv_id" title="清空 todbv_id" :disabled="busy" @click="entry.manualId = ''">×</button>
            </label>
            <div class="recognize-action">
              <button type="button" class="button button-soft" :disabled="busy || entry.status === 'recognizing'" @click="$emit('recognize', entry)">
                {{ entry.status === 'recognizing' ? '识别中…' : '重新识别' }}
              </button>
              <small v-if="entry.cached" class="cache-label">使用缓存</small>
            </div>
          </div>
        </div>

        <div v-if="entry.status === 'error' && !entry.recognition" class="recognition-actions retry-actions">
          <label class="manual-id">
            <span class="sr-only">todbv_id</span>
            <input :value="entry.manualId ?? ''" inputmode="numeric" placeholder="todbv_id（可选）" :disabled="busy" @input="setManualId(entry, $event)" />
            <button v-if="entry.manualId" type="button" class="icon-button clear-id" aria-label="清空 todbv_id" title="清空 todbv_id" :disabled="busy" @click="entry.manualId = ''">×</button>
          </label>
          <button type="button" class="button button-soft" :disabled="busy" @click="$emit('recognize', entry)">重新识别</button>
        </div>
        <p v-if="entry.error" class="inline-message message-error">{{ entry.error }}</p>
        <p v-if="entry.skipReason" class="inline-message message-muted">{{ entry.skipReason }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { FileEntry } from '@/types'

  defineProps<{ entries: FileEntry[]; busy?: boolean }>()
  defineEmits<{ recognize: [entry: FileEntry] }>()

  const sizeFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 })

  function isVideo(entry: FileEntry) {
    return entry.mime_type.startsWith('video/')
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    const units = ['KB', 'MB', 'GB', 'TB']
    let size = bytes / 1024
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${sizeFormatter.format(size)} ${units[unitIndex]}`
  }

  function statusText(entry: FileEntry) {
    const labels = {
      pending: '等待识别',
      recognizing: '识别中',
      success: entry.cached ? '缓存结果' : '识别成功',
      error: '识别失败',
      archiving: '入库中',
      archived: '已入库',
      'archive-error': '入库失败',
      skipped: entry.skipReason?.includes('.aria2') ? '下载中' : '已跳过',
    }
    return labels[entry.status]
  }

  function manualIdValue(entry: FileEntry) {
    return entry.manualId === undefined ? (entry.recognition?.todbv_id ?? '') : entry.manualId
  }

  function setManualId(entry: FileEntry, event: Event) {
    entry.manualId = (event.target as HTMLInputElement).value.replace(/\D/g, '')
  }

  function releaseDate(entry: FileEntry) {
    const recognition = entry.recognition
    if (!recognition) return '未知'
    return (recognition.video_type === 'tv' ? recognition.video_episode_date_air || recognition.date_air : recognition.date_air) || '未知'
  }

  function padNumber(value?: number) {
    return String(value ?? 0).padStart(2, '0')
  }
</script>
