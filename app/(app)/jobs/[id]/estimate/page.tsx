'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface LineItem {
  id: string
  finding_id: string | null
  catalog_item_id: string | null
  name: string
  description: string | null
  unit: string | null
  quantity: number | null
  unit_price: number | null
  quantity_source: string | null
  notes: string | null
  sort_order: number
}

interface Estimate {
  id: string
  title: string
  intro_text: string | null
  status: 'draft' | 'final'
  subtotal: number | null
  discount: number | null
  total: number | null
  job_id: string
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function lineTotal(item: LineItem): number | null {
  if (item.quantity == null || item.unit_price == null) return null
  return item.quantity * item.unit_price
}

function computeTotals(items: LineItem[], discount: number) {
  const subtotal = items.reduce((sum, item) => {
    const t = lineTotal(item)
    return t != null ? sum + t : sum
  }, 0)
  return { subtotal, total: Math.max(0, subtotal - discount) }
}

export default function EstimatePage() {
  const { id: jobId } = useParams<{ id: string }>()

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<LineItem>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', unit: '', quantity: '', unit_price: '' })
  const [saving, setSaving] = useState(false)

  const loadEstimate = useCallback(async () => {
    const res = await fetch(`/api/estimates?job_id=${jobId}`)
    const { estimate: est } = await res.json()
    if (!est) { setLoading(false); return }

    const detailRes = await fetch(`/api/estimates/${est.id}`)
    const { estimate: detail, line_items } = await detailRes.json()
    setEstimate(detail)
    setLineItems(line_items ?? [])
    setLoading(false)
  }, [jobId])

  useEffect(() => { loadEstimate() }, [loadEstimate])

  async function updateLineItem(id: string, patch: Partial<LineItem>) {
    const res = await fetch(`/api/line-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return
    const { line_item } = await res.json()
    setLineItems((prev) => prev.map((li) => (li.id === id ? line_item : li)))
    syncTotals([...lineItems.map((li) => (li.id === id ? line_item : li))])
  }

  async function deleteLineItem(id: string) {
    await fetch(`/api/line-items/${id}`, { method: 'DELETE' })
    const updated = lineItems.filter((li) => li.id !== id)
    setLineItems(updated)
    syncTotals(updated)
  }

  async function syncTotals(items: LineItem[]) {
    if (!estimate) return
    const { subtotal, total } = computeTotals(items, estimate.discount ?? 0)
    const res = await fetch(`/api/estimates/${estimate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtotal, total }),
    })
    if (!res.ok) return
    const { estimate: updated } = await res.json()
    setEstimate((prev) => prev ? { ...prev, subtotal: updated.subtotal, total: updated.total } : prev)
  }

  async function submitEdit(id: string) {
    setSaving(true)
    await updateLineItem(id, {
      name: editDraft.name,
      quantity: editDraft.quantity != null ? Number(editDraft.quantity) : null,
      unit_price: editDraft.unit_price != null ? Number(editDraft.unit_price) : null,
      unit: editDraft.unit ?? undefined,
      notes: editDraft.notes ?? undefined,
    })
    setEditingId(null)
    setSaving(false)
  }

  async function addManualItem() {
    if (!estimate || !newItem.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/line-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estimate_id: estimate.id,
        name: newItem.name,
        unit: newItem.unit || null,
        quantity: newItem.quantity ? Number(newItem.quantity) : null,
        unit_price: newItem.unit_price ? Number(newItem.unit_price) : null,
      }),
    })
    if (res.ok) {
      const { line_item } = await res.json()
      const updated = [...lineItems, line_item]
      setLineItems(updated)
      syncTotals(updated)
    }
    setNewItem({ name: '', unit: '', quantity: '', unit_price: '' })
    setShowAddForm(false)
    setSaving(false)
  }

  async function updateDiscount(value: number) {
    if (!estimate) return
    const { subtotal, total } = computeTotals(lineItems, value)
    const res = await fetch(`/api/estimates/${estimate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discount: value, subtotal, total }),
    })
    if (!res.ok) return
    const { estimate: updated } = await res.json()
    setEstimate((prev) => prev ? { ...prev, ...updated } : prev)
  }

  const missingQty = lineItems.filter((li) => li.quantity == null).length
  const { subtotal, total } = estimate
    ? computeTotals(lineItems, estimate.discount ?? 0)
    : { subtotal: 0, total: 0 }

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>

  if (!estimate) return (
    <div className="py-16 text-center text-gray-400 text-sm">
      No estimate found.{' '}
      <Link href={`/jobs/${jobId}`} className="text-violet-600 underline">Go back</Link>
    </div>
  )

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/jobs/${jobId}`} className="text-sm text-violet-600">← Back</Link>
        <h1 className="text-base font-bold text-gray-900">Estimate</h1>
        <span className="text-xs text-gray-400 capitalize">{estimate.status}</span>
      </div>

      <p className="text-sm font-semibold text-gray-700 mb-4">{estimate.title}</p>

      {/* Line items */}
      {lineItems.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No line items yet. Add confirmed findings or add manually.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {lineItems.map((item) => {
            const isEditing = editingId === item.id
            const total = lineTotal(item)
            const needsQty = item.quantity == null

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 bg-white ${needsQty && !isEditing ? 'border-amber-300' : 'border-gray-200'}`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                      value={editDraft.name ?? ''}
                      onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Name"
                    />
                    <div className="flex gap-2">
                      <input
                        className="w-24 text-sm border border-gray-300 rounded-lg px-3 py-2"
                        value={editDraft.quantity ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, quantity: e.target.value as unknown as number }))}
                        placeholder="Qty"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                      <input
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
                        value={editDraft.unit ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, unit: e.target.value }))}
                        placeholder="Unit"
                      />
                      <input
                        className="w-28 text-sm border border-gray-300 rounded-lg px-3 py-2"
                        value={editDraft.unit_price ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, unit_price: e.target.value as unknown as number }))}
                        placeholder="Unit price"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <input
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                      value={editDraft.notes ?? ''}
                      onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="Notes (optional)"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={saving}
                        onClick={() => submitEdit(item.id)}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 shrink-0">
                        {total != null ? fmt(total) : <span className="text-amber-500">—</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      {needsQty ? (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Qty needed
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {item.quantity} {item.unit} × {fmt(item.unit_price)}
                        </span>
                      )}
                      <div className="ml-auto flex gap-3">
                        <button
                          onClick={() => { setEditingId(item.id); setEditDraft({ name: item.name, quantity: item.quantity, unit_price: item.unit_price, unit: item.unit ?? '', notes: item.notes ?? '' }) }}
                          className="text-xs text-violet-600 hover:text-violet-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteLineItem(item.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add manual line item */}
      {showAddForm ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 mb-1">New line item</p>
          <input
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            value={newItem.name}
            onChange={(e) => setNewItem((d) => ({ ...d, name: e.target.value }))}
            placeholder="Name *"
          />
          <div className="flex gap-2">
            <input
              className="w-24 text-sm border border-gray-300 rounded-lg px-3 py-2"
              value={newItem.quantity}
              onChange={(e) => setNewItem((d) => ({ ...d, quantity: e.target.value }))}
              placeholder="Qty"
              type="number"
              min="0"
              step="0.01"
            />
            <input
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
              value={newItem.unit}
              onChange={(e) => setNewItem((d) => ({ ...d, unit: e.target.value }))}
              placeholder="Unit"
            />
            <input
              className="w-28 text-sm border border-gray-300 rounded-lg px-3 py-2"
              value={newItem.unit_price}
              onChange={(e) => setNewItem((d) => ({ ...d, unit_price: e.target.value }))}
              placeholder="Unit price"
              type="number"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              disabled={saving || !newItem.name.trim()}
              onClick={addManualItem}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2.5 mb-4 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-violet-400 hover:text-violet-600"
        >
          + Add line item
        </button>
      )}

      {/* Totals */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{fmt(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Discount</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-24 text-right text-sm border border-gray-200 rounded-lg px-2 py-1"
              defaultValue={estimate.discount ?? 0}
              onBlur={(e) => updateDiscount(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-2">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {missingQty > 0 && (
          <p className="text-xs text-center text-amber-600">
            {missingQty} line item{missingQty !== 1 ? 's' : ''} still need{missingQty === 1 ? 's' : ''} a quantity before PDF generation.
          </p>
        )}
        <a
          href={estimate ? `/api/pdf/${estimate.id}` : '#'}
          aria-disabled={missingQty > 0}
          className={`flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 ${missingQty > 0 ? 'opacity-40 pointer-events-none' : ''}`}
        >
          Generate PDF
        </a>
      </div>
    </div>
  )
}
