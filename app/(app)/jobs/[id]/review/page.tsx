'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Photo {
  id: string
  signed_url: string
}

interface Finding {
  id: string
  issue_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggested_service: string
  status: 'ai_suggested' | 'confirmed' | 'rejected' | 'edited'
  notes?: string
  box_x?: number | null
  box_y?: number | null
  box_width?: number | null
  box_height?: number | null
}

const SEVERITY_BADGE: Record<Finding['severity'], string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const SEVERITY_COLOR: Record<Finding['severity'], string> = {
  low: '#6b7280',
  medium: '#d97706',
  high: '#ea580c',
  critical: '#dc2626',
}

function hasBox(f: Finding): f is Finding & { box_x: number; box_y: number; box_width: number; box_height: number } {
  return f.box_x != null && f.box_y != null && f.box_width != null && f.box_height != null
}

export default function ReviewPage() {
  const { id: jobId } = useParams<{ id: string }>()

  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [loadingFindings, setLoadingFindings] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Finding>>({})
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then(({ photos }) => {
        const ready: Photo[] = photos ?? []
        setPhotos(ready)
        if (ready.length > 0) setSelectedPhotoId(ready[0].id)
      })
      .finally(() => setLoadingPhotos(false))
  }, [jobId])

  useEffect(() => {
    if (!selectedPhotoId) return
    setLoadingFindings(true)
    setEditingId(null)
    setSelectedFindingId(null)
    fetch(`/api/findings?photo_id=${selectedPhotoId}`)
      .then((r) => r.json())
      .then(({ findings }) => setFindings(findings ?? []))
      .finally(() => setLoadingFindings(false))
  }, [selectedPhotoId])

  async function updateFinding(findingId: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/findings/${findingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return
    const { finding } = await res.json()
    setFindings((prev) => prev.map((f) => (f.id === findingId ? { ...f, ...finding } : f)))
  }

  function startEdit(finding: Finding) {
    setEditingId(finding.id)
    setEditDraft({
      issue_type: finding.issue_type,
      severity: finding.severity,
      description: finding.description,
      suggested_service: finding.suggested_service,
    })
  }

  async function submitEdit(findingId: string) {
    await updateFinding(findingId, { status: 'edited', ...editDraft })
    setEditingId(null)
  }

  function selectFinding(findingId: string) {
    setSelectedFindingId(findingId)
    document.getElementById(`finding-${findingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId)
  const confirmedCount = findings.filter((f) => f.status === 'confirmed' || f.status === 'edited').length
  const pendingCount = findings.filter((f) => f.status === 'ai_suggested').length
  const visibleBoxFindings = findings.filter((f) => f.status !== 'rejected' && hasBox(f))

  if (loadingPhotos) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
  if (!photos.length) return (
    <div className="py-16 text-center text-gray-400 text-sm">
      No analyzed photos yet.{' '}
      <Link href={`/jobs/${jobId}`} className="text-violet-600 underline">Go back</Link>
    </div>
  )

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/jobs/${jobId}`} className="text-sm text-violet-600">← Back</Link>
        <h1 className="text-base font-bold text-gray-900">Review Findings</h1>
        <span className="text-xs text-gray-400">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Photo strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelectedPhotoId(photo.id)}
            className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${photo.id === selectedPhotoId ? 'border-violet-600' : 'border-transparent'}`}
          >
            <Image src={photo.signed_url} alt="Roof photo" fill className="object-cover" sizes="64px" />
          </button>
        ))}
      </div>

      {/* Annotated photo */}
      {selectedPhoto && (
        <div className="relative w-full rounded-xl overflow-hidden bg-gray-100 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPhoto.signed_url}
            alt="Selected photo"
            className="w-full h-auto block"
          />

          {/* Bounding box overlay */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {visibleBoxFindings.map((finding) => {
              if (!hasBox(finding)) return null
              const color = SEVERITY_COLOR[finding.severity]
              const isSelected = finding.id === selectedFindingId
              return (
                <rect
                  key={finding.id}
                  x={finding.box_x}
                  y={finding.box_y}
                  width={finding.box_width}
                  height={finding.box_height}
                  fill={color}
                  fillOpacity={isSelected ? 0.25 : 0.1}
                  stroke={color}
                  strokeWidth={isSelected ? 0.8 : 0.5}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectFinding(finding.id)}
                />
              )
            })}
          </svg>

          {/* Numbered badges */}
          {visibleBoxFindings.map((finding, i) => {
            if (!hasBox(finding)) return null
            const color = SEVERITY_COLOR[finding.severity]
            const isSelected = finding.id === selectedFindingId
            return (
              <button
                key={finding.id}
                onClick={() => selectFinding(finding.id)}
                className="absolute flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold leading-none shadow-sm"
                style={{
                  left: `${finding.box_x}%`,
                  top: `${finding.box_y}%`,
                  backgroundColor: color,
                  transform: 'translate(-25%, -25%)',
                  outline: isSelected ? '2px solid white' : 'none',
                  outlineOffset: '1px',
                }}
                aria-label={`Finding ${i + 1}: ${finding.issue_type}`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      )}

      {/* Findings */}
      {loadingFindings ? (
        <p className="text-center text-sm text-gray-400 py-8">Loading findings…</p>
      ) : findings.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No findings for this photo.</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">{findings.length} finding{findings.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-400">{confirmedCount} confirmed · {pendingCount} pending</p>
          </div>

          <div className="space-y-3">
            {findings.map((finding, i) => {
              const isEditing = editingId === finding.id
              const isDone = finding.status === 'confirmed' || finding.status === 'edited' || finding.status === 'rejected'
              const isSelected = selectedFindingId === finding.id
              const badgeIndex = visibleBoxFindings.findIndex((f) => f.id === finding.id)

              return (
                <div
                  key={finding.id}
                  id={`finding-${finding.id}`}
                  className={`rounded-xl border p-4 transition-shadow ${finding.status === 'rejected' ? 'opacity-40' : ''} ${isDone && finding.status !== 'rejected' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'} ${isSelected ? 'ring-2 ring-violet-400' : ''}`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                        value={editDraft.issue_type ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, issue_type: e.target.value }))}
                        placeholder="Issue type"
                      />
                      <select
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                        value={editDraft.severity ?? 'medium'}
                        onChange={(e) => setEditDraft((d) => ({ ...d, severity: e.target.value as Finding['severity'] }))}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <textarea
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none"
                        rows={3}
                        value={editDraft.description ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                        placeholder="Description"
                      />
                      <input
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                        value={editDraft.suggested_service ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, suggested_service: e.target.value }))}
                        placeholder="Suggested service"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => submitEdit(finding.id)}
                          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="flex items-start justify-between gap-2 mb-2 cursor-pointer"
                        onClick={() => hasBox(finding) && selectFinding(finding.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {badgeIndex >= 0 && (
                            <span
                              className="flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: SEVERITY_COLOR[finding.severity] }}
                            >
                              {badgeIndex + 1}
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_BADGE[finding.severity]}`}>
                            {finding.severity}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {finding.issue_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {finding.status === 'confirmed' && <span className="text-xs text-green-600 font-semibold shrink-0">✓ Confirmed</span>}
                        {finding.status === 'edited' && <span className="text-xs text-blue-600 font-semibold shrink-0">✓ Edited</span>}
                        {finding.status === 'rejected' && <span className="text-xs text-red-500 font-semibold shrink-0">Rejected</span>}
                      </div>

                      <p className="text-sm text-gray-600 mb-1">{finding.description}</p>
                      <p className="text-xs text-gray-400">Service: {finding.suggested_service}</p>
                      {finding.notes && <p className="text-xs text-gray-400 mt-1">Note: {finding.notes}</p>}

                      {finding.status === 'ai_suggested' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => updateFinding(finding.id, { status: 'confirmed' })}
                            className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => startEdit(finding)}
                            className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => updateFinding(finding.id, { status: 'rejected' })}
                            className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {isDone && finding.status !== 'rejected' && (
                        <button
                          onClick={() => startEdit(finding)}
                          className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                          Edit
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
