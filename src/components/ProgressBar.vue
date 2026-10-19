<template>
  <div class="progress-wrap">
    <div class="progress-label">
      <span>{{ label }}</span>
      <div class="progress-values">
        <span>
          {{ boundedCurrent }}
          <i>/</i>
          {{ total }}
        </span>
        <strong>{{ progress }}%</strong>
      </div>
    </div>
    <div
      class="progress-track"
      role="progressbar"
      :aria-label="label"
      :aria-valuenow="progress"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuetext="`${boundedCurrent} / ${total} (${progress}%)`">
      <span class="progress-fill" :style="{ width: `${progress}%` }"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps<{ label: string; current: number; total: number }>()
  const boundedCurrent = computed(() => Math.max(0, Math.min(props.current, props.total)))
  const progress = computed(() => (props.total > 0 ? Math.round((boundedCurrent.value / props.total) * 100) : 0))
</script>
