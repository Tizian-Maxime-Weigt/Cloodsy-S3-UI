import { Download, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  VIEW_MAX_BYTES,
  fetchObjectBlob,
  S3OpsError,
} from '../../api/s3'
import { fileNameFromKey, formatBytes } from '../../lib/format'
import { objectKeyFromUrl } from '../../lib/preview'
import { Button } from '../ui/Button'
import { ObjectPreview } from './ObjectPreview'

export function ObjectPreviewScreen({ sourceUrl }: { sourceUrl: string }) {
  const objectKey = objectKeyFromUrl(sourceUrl)
  const name = fileNameFromKey(objectKey) || 'Object'
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; blob: Blob; contentType?: string }
  >({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    void (async () => {
      try {
        const result = await fetchObjectBlob(sourceUrl)
        if (cancelled) return
        if (result.blob.size > VIEW_MAX_BYTES) {
          setState({
            status: 'error',
            message: `File is ${formatBytes(result.blob.size)} — too large to preview in the browser.`,
          })
          return
        }
        setState({ status: 'ready', ...result })
      } catch (e) {
        if (cancelled) return
        setState({
          status: 'error',
          message:
            e instanceof S3OpsError
              ? e.message
              : 'Could not load this object. Check that the URL is still valid and that the S3 server allows CORS from this UI.',
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sourceUrl])

  return (
    <div className="preview-page">
      <header className="preview-page__bar">
        <div className="preview-page__brand">Cloodsy S3</div>
        <div className="preview-page__name" title={objectKey}>
          {name}
        </div>
        <div className="spacer" />
        <a
          className="btn btn-outline btn-sm"
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download size={14} />
          Download
        </a>
        <a
          className="btn btn-ghost btn-sm"
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={14} />
          Raw URL
        </a>
      </header>
      <div className="preview-page__body">
        {state.status === 'loading' ? (
          <div className="empty-state">
            <div className="spinner" />
            <div className="empty-state__title">Loading preview</div>
          </div>
        ) : null}
        {state.status === 'error' ? (
          <div className="empty-state">
            <div className="empty-state__title">Can’t preview this file</div>
            <p>{state.message}</p>
            <Button
              variant="outline"
              onClick={() => window.open(sourceUrl, '_blank', 'noopener,noreferrer')}
            >
              <Download size={14} />
              Download instead
            </Button>
          </div>
        ) : null}
        {state.status === 'ready' ? (
          <ObjectPreview
            blob={state.blob}
            objectKey={objectKey}
            contentType={state.contentType}
          />
        ) : null}
      </div>
    </div>
  )
}
