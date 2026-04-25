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
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue

        setStatus('uploading')
        const compressed = await resizeImage(file)
        const form = new FormData()
        form.append('file', compressed, file.name)
        form.append('job_id', jobId)

        const uploadRes = await fetch('/api/photos/upload', { method: 'POST', body: form })
        if (!uploadRes.ok) throw new Error(await uploadRes.text())

        const { id, signed_url } = await uploadRes.json()
        onUploaded({ id, signed_url, analysis_status: 'processing' })

        setStatus('analyzing')
        const analyzeRes = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_id: id }),
        })

        onAnalysisComplete(id, analyzeRes.ok ? 'complete' : 'failed')
      }
    } catch {
      setError('Upload failed — please try again.')
    } finally {
      setStatus('idle')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const label =
    status === 'uploading' ? 'Uploading…' :
    status === 'analyzing' ? 'Analyzing…' :
    '+ Add Photos'

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status !== 'idle'}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50"
      >
        {label}
      </button>
      {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}
    </div>
  )
}
