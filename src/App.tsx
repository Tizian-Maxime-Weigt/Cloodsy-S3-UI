import { useEffect, useState } from 'react'
import { ObjectPreviewScreen } from './components/preview/ObjectPreviewScreen'
import { Shell } from './components/layout/Shell'
import { ToastStack } from './components/ui/ToastStack'
import { parseViewHash } from './lib/preview'
import { AuthStoreProvider } from './store/auth'
import { BucketStoreProvider } from './store/buckets'
import { ServerStoreProvider } from './store/ServerStore'
import { ThemeStoreProvider } from './store/theme'
import { ToastStoreProvider } from './store/toast'

function useViewSource(): string | null {
  const [url, setUrl] = useState(() => parseViewHash())
  useEffect(() => {
    const sync = () => setUrl(parseViewHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  return url
}

export default function App() {
  const viewUrl = useViewSource()

  return (
    <ThemeStoreProvider>
      {viewUrl ? (
        <ObjectPreviewScreen sourceUrl={viewUrl} />
      ) : (
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
      )}
    </ThemeStoreProvider>
  )
}
