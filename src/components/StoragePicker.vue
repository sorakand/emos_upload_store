<template>
  <section class="panel storage-picker">
    <div>
      <p class="eyebrow">暂存区</p>
      <h2>存储位置</h2>
    </div>
    <div class="picker-controls">
      <label class="sr-only" for="storage-path">选择存储位置</label>
      <select id="storage-path" :value="modelValue" :disabled="loading || disabled" @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
        <option value="" disabled>选择存储位置</option>
        <option v-for="disk in disks" :key="disk" :value="disk">{{ disk }}</option>
      </select>
      <button class="button button-secondary" type="button" :disabled="!modelValue || loading || disabled" @click="$emit('refresh')">
        <span v-if="loading" class="spinner spinner-small" aria-hidden="true"></span>
        {{ loading ? '读取中' : '刷新列表' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
  defineProps<{ disks: string[]; modelValue: string; loading?: boolean; disabled?: boolean }>()
  defineEmits<{ 'update:modelValue': [value: string]; refresh: [] }>()
</script>
