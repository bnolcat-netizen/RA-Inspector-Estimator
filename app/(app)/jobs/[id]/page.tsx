'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PhotoUploader from '@/components/photos/PhotoUploader'
import Image from 'next/image'

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
        setPhotos(photos ?? [])
      })
      .finally(() => setLoading(false))
  }, [id])

  function handleUploaded(photo: Photo) {
    setPhotos((prev) => [...prev, photo])
  }

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
  if (!job) return <div className="py-16 text-center text-gray-400 text-sm">Job not found.</div>

  const addressLine = [job.address, job.city, job.state, job.zip].filter(Boolean).join(', ')

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{job.client_name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{addressLine}</p>
        {job.notes && <p className="text-sm text-gray-600 mt-2">{job.notes}</p>}
      </div>

      <PhotoUploader jobId={id} onUploaded={handleUploaded} />

      {photos.length > 0 && (
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
            </div>
          ))}
        </div>
      )}

      {!photos.length && (
        <p className="text-center text-sm text-gray-400 mt-8">No photos yet — tap Add Photos to start.</p>
      )}
    </div>
  )
}
