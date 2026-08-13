import { useEffect, useState, type ReactNode } from 'react'
import {
  isAudioKey,
  isPdfKey,
  isRasterImageKey,
  isVideoKey,
  needsSandboxedPreview,
  blobForView,
} from '../../api/s3'
import { fileNameFromKey } from '../../lib/format'

const SANDBOX = 'allow-scripts allow-forms allow-popups allow-modals allow-presentation'

export function ObjectPreview({
  blob,
  objectKey,
  contentType,
}: {
  blob: Blob
  objectKey: string
  contentType?: string
}) {
  const [src, setSrc] = useState('')
  const typeHint = contentType || blob.type

  useEffect(() => {
    const typed = blobForView(blob, objectKey, contentType)
    const url = URL.createObjectURL(typed)
    setSrc(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [blob, objectKey, contentType])

  if (!src) {
    return <div className="object-preview__loading">Preparing preview…</div>
  }

  const name = fileNameFromKey(objectKey) || 'object'

  let body: ReactNode
  if (needsSandboxedPreview(objectKey, typeHint)) {
    body = (
      <iframe
        className="object-preview__frame"
        title={name}
        src={src}
        sandbox={SANDBOX}
        referrerPolicy="no-referrer"
      />
    )
  } else if (isRasterImageKey(objectKey, typeHint)) {
    body = (
      <div className="object-preview__media">
        <img src={src} alt={name} />
      </div>
    )
  } else if (isPdfKey(objectKey, typeHint)) {
    body = (
      <iframe
        className="object-preview__frame"
        title={name}
        src={src}
        referrerPolicy="no-referrer"
      />
    )
  } else if (isVideoKey(objectKey, typeHint)) {
    body = (
      <div className="object-preview__media">
        <video src={src} controls playsInline />
      </div>
    )
  } else if (isAudioKey(objectKey, typeHint)) {
    body = (
      <div className="object-preview__media">
        <audio src={src} controls />
      </div>
    )
  } else {
    body = (
      <iframe
        className="object-preview__frame"
        title={name}
        src={src}
        sandbox={SANDBOX}
        referrerPolicy="no-referrer"
      />
    )
  }

  return <div className="object-preview">{body}</div>
}
