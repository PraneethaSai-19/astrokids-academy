import { useState } from 'react'
import { Backpack, Droplets, Hand, Headphones, Link2, Shield, Snowflake, Wind, Wrench, Footprints, HardHat } from 'lucide-react'
import { api, errorMessage } from '../../services/api'
import { sfx } from '../../utils/sound'
import { ErrorBox } from '../../components/ui'

const ICONS = { helmet: HardHat, gloves: Hand, boots: Footprints, oxygen: Wind, water: Droplets, cooling: Snowflake, radio: Headphones, tether: Link2, drill: Wrench }

export default function EquipmentGame({ config, childId, code, onComplete }) {
  const [placements, setPlacements] = useState({})   // itemId -> categoryId (only correct ones)
  const [mistakes, setMistakes] = useState(0)
  const [selected, setSelected] = useState(null)      // tap-to-place fallback
  const [dragId, setDragId] = useState(null)
  const [feedback, setFeedback] = useState({ text: 'Drag each piece of gear into the group where it belongs. (On a touch screen: tap the item, then tap the group.)', ok: null })
  const [bounce, setBounce] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remaining = config.items.filter((i) => !placements[i.id])

  const place = async (itemId, catId) => {
    if (busy || placements[itemId]) return
    setBusy(true); setError('')
    try {
      const r = await api.missionCheck(childId, code, { item_id: itemId, category_id: catId })
      const item = config.items.find((i) => i.id === itemId)
      if (r.correct) {
        sfx.good()
        const next = { ...placements, [itemId]: catId }
        setPlacements(next)
        setFeedback({ text: `${item.name}: ${r.explanation}`, ok: true })
        if (Object.keys(next).length === config.items.length) {
          setTimeout(() => onComplete({ placements: next, mistakes: mistakes }), 900)
        }
      } else {
        sfx.bad(); setMistakes((m) => m + 1); setBounce(itemId); setTimeout(() => setBounce(null), 500)
        setFeedback({ text: r.explanation, ok: false })
      }
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false); setSelected(null); setDragId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xl font-black">
        <span>Sorted: {Object.keys(placements).length} / {config.items.length}</span><span className="text-blush">Oops count: {mistakes}</span>
      </div>
      <ErrorBox message={error} />
      <div className="card" aria-label="Equipment to sort">
        <p className="mb-2 text-lg font-extrabold text-planet">Gear locker</p>
        <div className="flex min-h-[5rem] flex-wrap gap-3">
          {remaining.length === 0 && <p className="text-lg font-bold text-mint">All gear sorted!</p>}
          {remaining.map((it) => { const Icon = ICONS[it.icon] || Shield; return (
            <button key={it.id} draggable onDragStart={(e) => { setDragId(it.id); e.dataTransfer.setData('text/plain', it.id); e.dataTransfer.effectAllowed = 'move' }}
              onDragEnd={() => setDragId(null)} onClick={() => { sfx.click(); setSelected(selected === it.id ? null : it.id) }}
              aria-pressed={selected === it.id} aria-label={`Equipment: ${it.name}`}
              className={`flex w-28 cursor-grab flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center font-extrabold transition active:cursor-grabbing ${selected === it.id ? 'border-star bg-star/25' : 'border-white/20 bg-white/10'} ${bounce === it.id ? 'animate-wiggle border-blush' : ''} ${dragId === it.id ? 'opacity-40' : ''}`}>
              <Icon className="h-10 w-10 text-star" /><span className="text-sm leading-tight">{it.name}</span>
            </button>) })}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {config.categories.map((c) => (
          <div key={c.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); place(e.dataTransfer.getData('text/plain') || dragId, c.id) }}
            onClick={() => selected && place(selected, c.id)} role="button" tabIndex={0} aria-label={`Group: ${c.title}`}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && selected) { e.preventDefault(); place(selected, c.id) } }}
            className={`min-h-[11rem] rounded-3xl border-4 border-dashed p-3 transition ${selected || dragId ? 'bg-white/15' : 'bg-white/5'}`} style={{ borderColor: c.color }}>
            <h3 className="text-xl font-black" style={{ color: c.color }}>{c.title}</h3>
            <p className="mb-2 text-sm font-bold text-white/70">{c.description}</p>
            <div className="flex flex-wrap gap-2">
              {config.items.filter((i) => placements[i.id] === c.id).map((it) => { const Icon = ICONS[it.icon] || Shield; return (
                <span key={it.id} className="flex items-center gap-1 rounded-full bg-mint/25 px-3 py-1 text-sm font-extrabold text-mint"><Icon className="h-4 w-4" />{it.name}</span>) })}
            </div>
          </div>
        ))}
      </div>
      <p className={`rounded-2xl p-4 text-center text-lg font-extrabold ${feedback.ok === true ? 'bg-mint/25 text-mint' : feedback.ok === false ? 'bg-blush/20 text-blush' : 'bg-white/10'}`} aria-live="polite">{feedback.text}</p>
    </div>
  )
}
