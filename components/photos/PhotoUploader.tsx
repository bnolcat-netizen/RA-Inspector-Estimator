'use client'

import { useRef, useState } from 'react'
import { resizeImage } from '@/lib/utils/image'

export interface UploadedPhoto {
  id: string
  signed_url: string
  analysis_status: 'pending' | 'processing' | 'complete' | 'failed'
}

interface Props {
  jobId: string
  onUploaded: (photo: UploadedPhoto) => void
  onAnalysisComplete: (photoId: string, status: 'complete' | 'failed') => void
}

export default function PhotoUploader({ jobId, onUploaded, onAnalysisComplete }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    try {
      // Upload all files before starting any analysis so a page refresh doesn't lose queued photos
      const uploadedIds: string[] = []
      for (const file of imageFiles) {
        setStatus('uploading')
        const compressed = await resizeImage(file)
        const form = new FormData()
        form.append('file', compressed, file.name)
        form.append('job_id', jobId)

        const uploadRes = await fetch('/api/photos/upload', { method: 'POST', body: form })
        if (!uploadRes.ok) throw new Error(await uploadRes.text())

        const { id, signed_url } = await uploadRes.json()
        onUploaded({ id, signed_url, analysis_status: 'processing' })
        uploadedIds.push(id)
      }

      for (const photoId of uploadedIds) {
        setStatus('analyzing')
        const analyzeRes = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_id: photoId }),
        })
        onAnalysisComplete(photoId, analyzeRes.ok ? 'complete' : 'failed')
      }
    } catch {
      setError('Upload failed — please try again.')
    } finally {
      setStatus('idle')
      if (galleryRef.current) galleryRef.current.value = ''
      if (cameraRef.current) cameraRef.current.value = ''
    }
  }

  const busy = status !== 'idle'
  const statusLabel =
    status === 'uploading' ? 'Uploading…' :
    status === 'analyzing' ? 'Analyzing…' :
    null

  return (
    <div>
      {/* hidden inputs */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {statusLabel ? (
        <div className="w-full py-3 rounded-xl text-sm font-semibold text-center text-white bg-violet-400">
          {statusLabel}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => galleryRef.current?.click()}
            disabled={busy}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50"
          >
            📁 Gallery
          </button>
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50"
          >
            📷 Camera
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}
    </div>
  )
}
