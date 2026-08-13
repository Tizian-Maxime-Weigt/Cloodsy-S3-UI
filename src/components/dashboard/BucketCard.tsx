import { KeyRound, Layers } from 'lucide-react'
import type { Bucket } from '../../types'
import { StorageMeter } from '../ui/StorageMeter'

export function BucketCard({
  bucket,
  onOpen,
}: {
  bucket: Bucket
  onOpen: (name: string) => void
}) {
  return (
    <button className="panel bucket-card" onClick={() => onOpen(bucket.name)} type="button">
      <div className="bucket-card__title">{bucket.name}</div>
      <div className="bucket-card__meta">
        <span>{bucket.objects} objects</span>
        {bucket.versioning ? (
          <span className="badge">
            <Layers size={12} />
            {bucket.versioning}
          </span>
        ) : null}
        <span className="badge">
          <KeyRound size={12} />
          {bucket.credentials}
        </span>
      </div>
      <StorageMeter used={bucket.usageBytes} quota={bucket.quotaBytes} />
    </button>
  )
}
