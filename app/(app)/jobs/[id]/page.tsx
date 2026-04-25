'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import PhotoUploader, { type UploadedPhoto } from '@/components/photos/PhotoUploader'

function BuildEstimateButton({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const res = await fetch('/api/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId }),
    })
    if (res.ok) {
      router.push(`/jobs/${jobId}/estimate`)
    } else {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 active:bg-violet-200 disabled:opacity-50"
    >
      {loading ? 'Building estimate…' : 'Build Estimate'}
    </button>
  )
}

interface Job {
  id: string
  client_name: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  status: string
  notes: string | null
}

interface Photo {
  id: string
  signed_url: string
  analysis_status: 'pending' | 'processing' | 'complete' | 'failed'
}

const STATUS_BADGE: Record<Photo['analysis_status'], string> = {
  pending: 'bg-gray-400',
  processing: 'bg-amber-400',
  complete: 'bg-green-500',
  failed: 'bg-red-500',
}

const STATUS_LABEL: Record<Photo['analysis_status'], string> = {
  pending: 'Pending',
  processing: 'Analyzing…',
  complete: 'Ready',
  failed: 'Failed',
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then(({ job, photos }) => {
        setJob(job)
        setPhotos(
          (photos ?? []).map((p: { id: string; signed_url: string }) => ({
            ...p,
            analysis_status: 'complete' as const,
          }))
        )
      })
      .finally(() => setLoading(false))
  }, [id])

  function handleUploaded(photo: UploadedPhoto) {
    setPhotos((prev) => [...prev, photo])
  }

  function handleAnalysisComplete(photoId: string, status: 'complete' | 'failed') {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, analysis_status: status } : p))
    )
  }

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
  if (!job) return <div className="py-16 text-center text-gray-400 text-sm">Job not found.</div>

  const addressLine = [job.address, job.city, job.state, job.zip].filter(Boolean).join(', ')
  const readyPhotos = photos.filter((p) => p.analysis_status === 'complete').length

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{job.client_name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{addressLine}</p>
        {job.notes && <p className="text-sm text-gray-600 mt-2">{job.notes}</p>}
      </div>

      <PhotoUploader
        jobId={id}
        onUploaded={handleUploaded}
        onAnalysisComplete={handleAnalysisComplete}
      />

      {photos.length > 0 && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={photo.signed_url}
                  alt="Roof photo"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 200px"
                />
                <span className={`absolute top-1 right-1 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[photo.analysis_status]}`}>
                  {STATUS_LABEL[photo.analysis_status]}
                </span>
              </div>
            ))}
          </div>

          {readyPhotos > 0 && (
            <div className="mt-4 space-y-2">
              <Link
                href={`/jobs/${id}/review`}
                className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800"
              >
                Review Findings ({readyPhotos} photo{readyPhotos !== 1 ? 's' : ''} ready)
              </Link>
              <BuildEstimateButton jobId={id} />
            </div>
          )}
        </>
      )}

      {!photos.length && (
        <p className="text-center text-sm text-gray-400 mt-8">No photos yet — tap Add Photos to start.</p>
      )}
    </div>
  )
}
