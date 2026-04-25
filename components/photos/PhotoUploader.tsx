'use client'

import { useRef, useState } from 'react'
import { resizeImage } from '@/lib/utils/image'

interface UploadedPhoto {
  id: string
  signed_url: string
}

interface Props {
  jobId: string
  onUploaded: (photo: UploadedPhoto) => void
}

export default function PhotoUploader({ jobId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue

        const compressed = await resizeImage(file)
        const form = new FormData()
        form.append('file', compressed, file.name)
        form.append('job_id', jobId)

        const res = await fetch('/api/photos/upload', { method: 'POST', body: form })
        if (!res.ok) throw new Error(await res.text())

        const photo: UploadedPhoto = await res.json()
        onUploaded(photo)
      }
    } catch {
      setError('Upload failed — please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : '+ Add Photos'}
      </button>
      {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}
    </div>
  )
}
