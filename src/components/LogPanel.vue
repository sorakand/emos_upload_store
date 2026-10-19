<template>
  <section class="panel log-section">
    <div class="section-heading log-heading">
      <div>
        <p class="eyebrow">运行记录</p>
        <h2>处理日志</h2>
      </div>
      <button class="text-button" type="button" :disabled="!items.length" @click="$emit('clear')">清空</button>
    </div>
    <div class="log-list" aria-live="polite">
      <p v-if="!items.length" class="log-empty">暂无日志</p>
      <div v-for="(item, index) in items" :key="`${item.time}-${index}`" class="log-entry" :class="`log-${item.level}`">
        <time>{{ item.time }}</time>
        <span>{{ item.message }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { LogEntry } from '@/types'

  defineProps<{ items: LogEntry[] }>()
  defineEmits<{ clear: [] }>()
</script>
