import { ServerStoreProvider } from './store/ServerStore'
import { AuthStoreProvider } from './store/auth'
import { BucketStoreProvider } from './store/buckets'
import { ThemeStoreProvider } from './store/theme'
import { ToastStoreProvider } from './store/toast'
import { Shell } from './components/layout/Shell'
import { ToastStack } from './components/ui/ToastStack'

export default function App() {
  return (
    <ThemeStoreProvider>
      <ToastStoreProvider>
        <ServerStoreProvider>
          <AuthStoreProvider>
            <BucketStoreProvider>
              <Shell />
              <ToastStack />
            </BucketStoreProvider>
          </AuthStoreProvider>
        </ServerStoreProvider>
      </ToastStoreProvider>
    </ThemeStoreProvider>
  )
}
