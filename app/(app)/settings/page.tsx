'use client'

import { useEffect, useState } from 'react'

const UNITS = ['each', 'linear ft', 'sq ft', 'sq m', 'hour', 'square (100 sq ft)']

interface CatalogItem {
  id: string
  name: string
  description: string | null
  unit: string | null
  default_price: number | null
  issue_types: string[]
  active: boolean
  sort_order: number
}

type Draft = Omit<CatalogItem, 'id' | 'sort_order'>

const EMPTY_DRAFT: Draft = {
  name: '',
  description: '',
  unit: 'each',
  default_price: null,
  issue_types: [],
  active: true,
}

export default function SettingsPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [adding, setAdding] = useState(false)
  const [addDraft, setAddDraft] = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(({ items }) => setItems(items ?? []))
      .finally(() => setLoading(false))
  }, [])

  function startEdit(item: CatalogItem) {
    setEditingId(item.id)
    setEditDraft({
      name: item.name,
      description: item.description ?? '',
      unit: item.unit ?? 'each',
      default_price: item.default_price,
      issue_types: item.issue_types ?? [],
      active: item.active,
    })
    setAdding(false)
    setConfirmDeleteId(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/catalog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editDraft,
          description: editDraft.description || null,
          default_price: editDraft.default_price,
        }),
      })
      const { item } = await res.json()
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)))
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    await fetch(`/api/catalog/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (editingId === id) setEditingId(null)
    setConfirmDeleteId(null)
  }

  async function addItem() {
    if (!addDraft.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addDraft,
          description: addDraft.description || null,
          sort_order: items.length,
        }),
      })
      const { item } = await res.json()
      setItems((prev) => [...prev, item])
      setAdding(false)
      setAddDraft(EMPTY_DRAFT)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: CatalogItem) {
    const res = await fetch(`/api/catalog/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    })
    const { item: updated } = await res.json()
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
  }

  if (loading) return <div className="py-16 text-center text-sm text-gray-400">Loading…</div>

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Service Catalog</h1>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setEditingId(null); setAddDraft(EMPTY_DRAFT) }}
            className="text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 px-4 py-2.5 rounded-lg"
          >
            + Add service
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-4 mb-4">
          <p className="text-sm font-semibold text-violet-800 mb-3">New service</p>
          <ItemForm draft={addDraft} onChange={setAddDraft} />
          <div className="flex gap-2 mt-3">
            <button
              onClick={addItem}
              disabled={saving || !addDraft.name.trim()}
              className="flex-1 py-3 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="flex-1 py-3 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding && (
        <p className="text-sm text-gray-400 text-center py-12">No services yet. Add your first one above.</p>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const isEditing = editingId === item.id

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 ${!item.active ? 'opacity-50' : ''} ${isEditing ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-white'}`}
            >
              {isEditing ? (
                <>
                  <ItemForm draft={editDraft} onChange={setEditDraft} />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => saveEdit(item.id)}
                      disabled={saving || !editDraft.name.trim()}
                      className="flex-1 py-3 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setConfirmDeleteId(null) }}
                      className="flex-1 py-3 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    {confirmDeleteId === item.id ? (
                      <>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="py-3 px-3 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="py-3 px-3 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="py-3 px-3 rounded-lg text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                      {item.unit && (
                        <span className="text-xs text-gray-400">/ {item.unit}</span>
                      )}
                      {item.default_price != null && (
                        <span className="text-xs font-semibold text-violet-700">
                          ${Number(item.default_price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mb-1">{item.description}</p>
                    )}
                    {item.issue_types?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.issue_types.map((t) => (
                          <span key={t} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                            {t.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`text-xs font-semibold px-3 py-2 rounded-lg ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                      title={item.active ? 'Active — tap to deactivate' : 'Inactive — tap to activate'}
                    >
                      {item.active ? 'Active' : 'Off'}
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="text-xs font-semibold px-3 py-2 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function IssueTypesInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [raw, setRaw] = useState(value.join(', '))

  function handleBlur() {
    const parsed = raw
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean)
    onChange(parsed)
    setRaw(parsed.join(', '))
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        Issue types <span className="font-normal text-gray-400">(comma-separated)</span>
      </label>
      <input
        className="w-full text-base border border-gray-300 rounded-lg px-3 py-2"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        placeholder="e.g. cracked_shingle, missing_shingle"
      />
    </div>
  )
}

function ItemForm({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Service name *</label>
        <input
          className="w-full text-base border border-gray-300 rounded-lg px-3 py-2"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="e.g. Shingle Replacement"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
        <textarea
          className="w-full text-base border border-gray-300 rounded-lg px-3 py-2 resize-none"
          rows={2}
          value={draft.description ?? ''}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          placeholder="Short description of the service"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
          <select
            className="w-full text-base border border-gray-300 rounded-lg px-3 py-2"
            value={draft.unit ?? ''}
            onChange={(e) => onChange({ ...draft, unit: e.target.value })}
          >
            <option value="">— none —</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Default price ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full text-base border border-gray-300 rounded-lg px-3 py-2"
            value={draft.default_price ?? ''}
            onChange={(e) => onChange({ ...draft, default_price: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="0.00"
          />
        </div>
      </div>
      <IssueTypesInput value={draft.issue_types} onChange={(v) => onChange({ ...draft, issue_types: v })} />
    </div>
  )
}
