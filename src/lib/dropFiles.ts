export type DroppedFile = {
  file: File
  relativePath: string
}

const SKIP_NAMES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini'])

export function dataTransferHasFiles(dt: DataTransfer | null | undefined): dt is DataTransfer {
  if (!dt) return false
  return Array.from(dt.types).includes('Files')
}

/** Strip `.` / `..` and normalize separators so keys stay under the current prefix. */
export function sanitizeRelativePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part !== '' && part !== '.' && part !== '..')
    .join('/')
}

export function filesFromList(files: FileList | Iterable<File>): DroppedFile[] {
  return Array.from(files)
    .map((file) => ({
      file,
      relativePath: sanitizeRelativePath(file.webkitRelativePath || file.name),
    }))
    .filter((item) => item.relativePath && !SKIP_NAMES.has(item.file.name))
}

function getAsEntry(item: DataTransferItem): FileSystemEntry | null {
  return item.webkitGetAsEntry?.() ?? null
}

async function readAllDirectoryEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = []
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
    if (!batch.length) break
    all.push(...batch)
  }
  return all
}

async function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject)
  })
}

async function walkEntry(
  entry: FileSystemEntry,
  parentPath: string,
  out: DroppedFile[],
): Promise<void> {
  if (entry.name === '__MACOSX') return

  if (entry.isFile) {
    const file = await fileFromEntry(entry as FileSystemFileEntry)
    if (SKIP_NAMES.has(file.name)) return
    const relativePath = sanitizeRelativePath(
      parentPath ? `${parentPath}/${file.name}` : file.name,
    )
    if (relativePath) out.push({ file, relativePath })
    return
  }

  if (!entry.isDirectory) return
  const dirPath = parentPath ? `${parentPath}/${entry.name}` : entry.name
  const children = await readAllDirectoryEntries(
    (entry as FileSystemDirectoryEntry).createReader(),
  )
  for (const child of children) {
    await walkEntry(child, dirPath, out)
  }
}

/** Collect files from a drop, preserving folder relative paths when the browser allows it. */
export async function collectDroppedFiles(dt: DataTransfer): Promise<DroppedFile[]> {
  // Snapshot FileList before the drop event ends — browsers clear it afterwards.
  const fallback = filesFromList(dt.files)
  const items = dt.items
  if (items?.length) {
    const entries: FileSystemEntry[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      if (item.kind !== 'file') continue
      const entry = getAsEntry(item)
      if (entry) entries.push(entry)
    }
    if (entries.length) {
      const out: DroppedFile[] = []
      for (const entry of entries) {
        await walkEntry(entry, '', out)
      }
      if (out.length) return out
    }
  }
  return fallback
}
