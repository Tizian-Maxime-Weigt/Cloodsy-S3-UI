import { fileNameFromKey } from '../../lib/format'
import { Modal } from '../ui/Modal'
import { ObjectPreview } from '../preview/ObjectPreview'

export function PreviewDialog({
  open,
  objectKey,
  blob,
  contentType,
  onClose,
}: {
  open: boolean
  objectKey: string
  blob: Blob | null
  contentType?: string
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={objectKey ? fileNameFromKey(objectKey) : 'Preview'}
      preview
    >
      {blob ? (
        <ObjectPreview blob={blob} objectKey={objectKey} contentType={contentType} />
      ) : null}
    </Modal>
  )
}
