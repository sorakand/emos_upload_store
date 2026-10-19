import ky from 'ky'
import { useSignStore } from '@/stores/sign'

export const PREFIX_URL = import.meta.env.PROD ? 'https://emos.best/' : '/'

const client = ky.create({
  prefixUrl: PREFIX_URL,
  timeout: 30_000,
  retry: 0,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useSignStore().userToken
        if (token) request.headers.set('Authorization', `Bearer ${token}`)
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status !== 401) return
        useSignStore().signOut()
        window.location.href = `${PREFIX_URL}api/sign?state=emos_store_upload`
      },
    ],
  },
})

export default client
