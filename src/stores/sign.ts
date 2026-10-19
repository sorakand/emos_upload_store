import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useSignStore = defineStore(
  'sign',
  () => {
    const username = ref('')
    const avatar = ref<string | null>(null)
    const userToken = ref('')

    const isSignedIn = computed(() => Boolean(userToken.value))

    function setToken(token: string) {
      userToken.value = token
    }

    function signOut() {
      username.value = ''
      avatar.value = null
      userToken.value = ''
    }

    return { username, avatar, userToken, isSignedIn, setToken, signOut }
  },
  { persist: true },
)
