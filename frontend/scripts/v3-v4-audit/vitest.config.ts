import { mergeConfig } from 'vite'
import base from '../../vite.config'

export default mergeConfig(base, {
  root: new URL('../../', import.meta.url).pathname,
  test: { setupFiles: [new URL('./capture.setup.ts', import.meta.url).pathname] },
})
