import { Copy, Eye, Link2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  PRESIGN_DEFAULT_GET_SECONDS,
  PRESIGN_DEFAULT_PUT_SECONDS,
  PRESIGN_EXPIRY_OPTIONS,
  canPreviewInBrowser,
  guessContentType,
  presignPutExample,
  s3PresignUrl,
  type PresignMethod,
  type S3Session,
} from '../../api/s3'
import { fileNameFromKey } from '../../lib/format'
import { buildViewHref } from '../../lib/preview'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'

export function PresignDialog({
  open,
  session,
  bucket,
  objectKey,
  defaultMethod,
  canWrite,
  onClose,
}: {
  open: boolean
  session: S3Session | null
  bucket: string
  objectKey: string
  defaultMethod: PresignMethod
  canWrite: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const [method, setMethod] = useState<PresignMethod>(defaultMethod)
  const [expiresIn, setExpiresIn] = useState(
    defaultMethod === 'PUT' ? PRESIGN_DEFAULT_PUT_SECONDS : PRESIGN_DEFAULT_GET_SECONDS,
  )
  const [key, setKey] = useState(objectKey)
  const [contentType, setContentType] = useState(guessContentType(objectKey) || '')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetKey = `${open}-${objectKey}-${defaultMethod}`
  const [prev, setPrev] = useState(resetKey)
  if (resetKey !== prev) {
    setPrev(resetKey)
    setMethod(defaultMethod)
    setExpiresIn(
      defaultMethod === 'PUT' ? PRESIGN_DEFAULT_PUT_SECONDS : PRESIGN_DEFAULT_GET_SECONDS,
    )
    setKey(objectKey)
    setContentType(guessContentType(objectKey) || '')
    setUrl('')
    setBusy(false)
    setError(null)
  }

  const putType = contentType.trim() || guessContentType(key) || 'application/octet-stream'
  const viewable = method === 'GET' && canPreviewInBrowser(key, putType)
  const viewHref = useMemo(() => (url && viewable ? buildViewHref(url) : ''), [url, viewable])
  const curl = useMemo(
    () => (url && method === 'PUT' ? presignPutExample(url, putType) : ''),
    [url, method, putType],
  )

  useEffect(() => {
    if (!open || !session || !key.trim()) {
      setUrl('')
      return
    }
    let cancelled = false
    setBusy(true)
    setError(null)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const signed = await s3PresignUrl(
            session,
            bucket,
            key.trim().replace(/^\/+/, ''),
            {
              method,
              expiresIn,
              contentType:
                method === 'PUT'
                  ? contentType.trim() || guessContentType(key) || 'application/octet-stream'
                  : undefined,
            },
          )
          if (!cancelled) setUrl(signed)
        } catch (e) {
          if (!cancelled) {
            setUrl('')
            setError(e instanceof Error ? e.message : 'Could not sign URL')
          }
        } finally {
          if (!cancelled) setBusy(false)
        }
      })()
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, method, key, expiresIn, contentType, session, bucket])

  const copy = async (value: string, ok: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      toast(ok, 'success')
    } catch {
      toast(value, 'info')
    }
  }

  const title =
    method === 'PUT'
      ? 'Presigned upload URL'
      : objectKey
        ? `Share ${fileNameFromKey(objectKey)}`
        : 'Presigned URL'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => void copy(viewHref || url, viewHref ? 'View link copied' : 'URL copied')}
            disabled={!url || busy}
          >
            <Copy size={14} />
            Copy {viewHref ? 'view link' : 'URL'}
          </Button>
        </>
      }
    >
      <p className="presign-lead">
        Time-limited link with a SigV4 signature. Anyone who has it can{' '}
        {method === 'PUT' ? 'upload to this key' : 'read this object'} until it expires.
      </p>

      <div className="presign-grid">
        <Field label="Operation">
          <Select
            value={method}
            onChange={(e) => {
              const next = e.target.value === 'PUT' ? 'PUT' : 'GET'
              if (next === 'PUT' && !canWrite) return
              setMethod(next)
              setExpiresIn(
                next === 'PUT' ? PRESIGN_DEFAULT_PUT_SECONDS : PRESIGN_DEFAULT_GET_SECONDS,
              )
            }}
          >
            <option value="GET">GET — download / view</option>
            <option value="PUT" disabled={!canWrite}>
              PUT — upload
            </option>
          </Select>
        </Field>
        <Field label="Expiry">
          <Select
            value={String(expiresIn)}
            onChange={(e) => setExpiresIn(Number(e.target.value))}
          >
            {PRESIGN_EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.seconds} value={opt.seconds}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Object key"
        hint={method === 'PUT' ? 'The key the file will be written to' : undefined}
      >
        <Input
          value={key}
          onChange={(e) => {
            setKey(e.target.value)
            if (method === 'PUT') {
              const guessed = guessContentType(e.target.value)
              if (guessed) setContentType(guessed)
            }
          }}
          placeholder="path/to/file.html"
        />
      </Field>

      {method === 'PUT' ? (
        <Field
          label="Content-Type"
          hint="Required on the PUT request. HTML should be text/html so browsers can render it."
        >
          <Input
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            placeholder="text/html"
          />
        </Field>
      ) : null}

      {error ? <div className="banner banner--warn">{error}</div> : null}

      <Field label="Presigned URL">
        <div className="presign-url">
          <code>{busy ? 'Signing…' : url || '—'}</code>
          <Button
            variant="outline"
            size="sm"
            disabled={!url || busy}
            onClick={() => void copy(url, 'Presigned URL copied')}
          >
            <Link2 size={14} />
            Copy
          </Button>
        </div>
      </Field>

      {viewHref ? (
        <Field
          label="View in browser"
          hint="Cloodsy serves GET as a download. This UI link fetches the object and renders HTML, images, and PDFs instead."
        >
          <div className="presign-url">
            <code>{viewHref}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(viewHref, '_blank', 'noopener,noreferrer')}
            >
              <Eye size={14} />
              Open
            </Button>
          </div>
        </Field>
      ) : method === 'GET' ? (
        <p className="field-hint">
          Opening the raw S3 URL downloads the file. Use View in the file list to render HTML in
          this UI.
        </p>
      ) : null}

      {curl ? (
        <Field label="Upload with curl">
          <div className="presign-url">
            <code>{curl}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copy(curl, 'curl command copied')}
            >
              <Copy size={14} />
              Copy
            </Button>
          </div>
        </Field>
      ) : null}
    </Modal>
  )
}
