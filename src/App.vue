<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="brand-mark">
          EMOS
          <span>/</span>
          UPLOAD STORE
        </p>
        <h1>暂存入库</h1>
      </div>
      <div v-if="user" class="account-menu">
        <img v-if="user.avatar" :src="user.avatar" alt="" class="avatar" />
        <span>{{ user.username }}</span>
        <button class="text-button" type="button" @click="logout">退出</button>
      </div>
    </header>

    <div v-if="loadingInit" class="page-state" role="status">
      <span class="spinner" aria-hidden="true"></span>
      <span>正在检查登录状态</span>
    </div>

    <template v-else>
      <StoragePicker v-model="pathType" :disks="disks" :loading="loadingFiles" :disabled="archiving" @refresh="loadFiles" />

      <section v-if="pathType" class="panel queue-overview" aria-label="处理概览">
        <div class="progress-grid" :class="{ 'is-archiving': archiving }">
          <ProgressBar label="识别进度" :current="recognizedCount" :total="entries.length" />
          <ProgressBar v-if="archiving" label="入库进度" :current="archiveIndex" :total="archiveTotal" />
        </div>
        <div class="overview-footer">
          <div class="stats" aria-label="文件统计">
            <span>
              <b class="stat-success">{{ successCount }}</b>
              成功
            </span>
            <span>
              <b class="stat-error">{{ failureCount }}</b>
              失败
            </span>
            <span>
              <b>{{ skippedCount }}</b>
              跳过
            </span>
            <span>
              <b>{{ pendingCount }}</b>
              待处理
            </span>
          </div>
          <button class="button button-primary" type="button" :disabled="!canArchive || loadingFiles" @click="archive">
            {{ archiving ? '正在入库…' : `确认入库 ${archiveableCount}` }}
          </button>
        </div>
      </section>

      <FileList v-if="pathType" :entries="entries" :busy="archiving || loadingFiles" @recognize="recognize" />

      <LogPanel :items="logs" @clear="clearLogs" />
    </template>
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { PREFIX_URL } from '@/utils/ky'
  import { useSignStore } from '@/stores/sign'
  import { api, type CurrentUser } from '@/api'
  import { useUploadQueue } from '@/composables/useUploadQueue'
  import FileList from '@/components/FileList.vue'
  import LogPanel from '@/components/LogPanel.vue'
  import ProgressBar from '@/components/ProgressBar.vue'
  import StoragePicker from '@/components/StoragePicker.vue'

  const sign = useSignStore()
  const user = ref<CurrentUser | null>(null)
  const disks = ref<string[]>([])
  const loadingInit = ref(true)
  const initialized = ref(false)
  const queue = useUploadQueue()
  const {
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
  } = queue
  const archiveableCount = computed(() => entries.value.filter((entry) => entry.status === 'success').length)

  function login() {
    window.location.href = `${PREFIX_URL}api/sign?state=emos_store_upload`
  }

  async function logout() {
    await sign.signOut()
    login()
  }

  watch(pathType, (value) => {
    if (value && initialized.value) void loadFiles()
  })

  onMounted(async () => {
    const query = new URLSearchParams(window.location.search)
    const token = query.get('token')
    if (token) {
      sign.setToken(token)
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    }

    if (!sign.isSignedIn) {
      login()
      return
    }

    try {
      const [currentUser, availableDisks] = await Promise.all([api.user(), api.disks()])
      user.value = currentUser
      disks.value = availableDisks
      if (!availableDisks.includes(pathType.value)) pathType.value = ''
      initialized.value = true
      if (pathType.value) await loadFiles()
    } catch {
      login()
    } finally {
      loadingInit.value = false
    }
  })
</script>
