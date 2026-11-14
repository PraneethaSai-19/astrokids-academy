import { useCallback, useEffect, useState } from 'react'
import { Bot, Clock, KeyRound, Lock, Shield, Trash2, UserCog, Users } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api, errorMessage, tokenStore } from '../services/api'
import { ErrorBox, Loading, PageTitle, Spinner } from '../components/ui'

const fmt = (d) => (d ? new Date(typeof d === 'string' && !d.endsWith('Z') && !d.includes('+') ? d + 'Z' : d).toLocaleString() : '-')
const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

function Gate({ onUnlock }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { const t = await api.parentGate(pw); tokenStore.setGate(t.access_token); onUnlock() } catch (x) { setErr(errorMessage(x)) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={go} className="card mx-auto mt-6 max-w-md space-y-4 text-center">
      <Lock className="mx-auto h-14 w-14 text-star" />
      <h1 className="text-3xl font-black">Grown-ups only</h1>
      <p className="text-lg font-bold text-white/80">Enter the parent password to see progress and change settings.</p>
      <ErrorBox message={err} />
      <input type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Parent password" autoComplete="current-password" aria-label="Parent password" />
      <button className="btn btn-yellow w-full" disabled={busy || !pw}>{busy ? <Spinner /> : <Shield className="h-6 w-6" />}Unlock parent area</button>
    </form>
  )
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-white/5 p-3">
      <span><span className="block text-lg font-extrabold">{label}</span>{hint && <span className="block text-sm font-bold text-white/70">{hint}</span>}</span>
      <input type="checkbox" role="switch" className="h-7 w-7 accent-star" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export default function ParentDashboard() {
  const { loadAccount, logout, setChildId, childId } = useApp()
  const [unlocked, setUnlocked] = useState(!!tokenStore.getGate())
  const [overview, setOverview] = useState(null)
  const [sel, setSel] = useState(null)
  const [report, setReport] = useState(null)
  const [tab, setTab] = useState('progress')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const fail = useCallback((e) => {
    if ([401, 403].includes(e.response?.status)) { tokenStore.setGate(null); setUnlocked(false) }
    else setError(errorMessage(e))
  }, [])

  const loadOverview = useCallback(() => api.parentOverview().then((o) => { setOverview(o); setSel((s) => s ?? o.children[0]?.id ?? null) }).catch(fail), [fail])
  useEffect(() => { if (unlocked) loadOverview() }, [unlocked, loadOverview])
  const loadReport = useCallback((id) => api.parentReport(id).then(setReport).catch(fail), [fail])
  useEffect(() => { if (unlocked && sel) { setReport(null); loadReport(sel) } }, [unlocked, sel, loadReport])

  if (!unlocked) return <div><PageTitle icon={Shield} title="Parent Dashboard" /><Gate onUnlock={() => { setUnlocked(true); setError('') }} /></div>
  if (!overview) return error ? <ErrorBox message={error} /> : <Loading text="Loading..." />

  const kid = overview.children.find((c) => c.id === sel)
  const setSetting = async (patch) => {
    setError(''); setNote('')
    try { await api.parentSettings(sel, patch); setNote('Saved!'); await Promise.all([loadOverview(), loadReport(sel)]); await loadAccount() } catch (e) { fail(e) }
  }

  return (
    <div className="space-y-5">
      <PageTitle icon={Shield} title="Parent Dashboard" subtitle={`Signed in as ${overview.parent.display_name}`}>
        <button className="btn btn-ghost !min-h-[44px]" onClick={() => { tokenStore.setGate(null); setUnlocked(false); setOverview(null) }}><Lock className="h-5 w-5" />Lock</button>
      </PageTitle>
      <ErrorBox message={error} />
      {note && <p className="rounded-2xl bg-mint/20 p-2 text-center text-lg font-extrabold text-mint" role="status">{note}</p>}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Children">
        {overview.children.map((c) => (
          <button key={c.id} role="tab" aria-selected={c.id === sel} onClick={() => setSel(c.id)} className={`btn !min-h-[44px] !py-2 !text-base ${c.id === sel ? 'btn-yellow' : 'btn-ghost'}`}><Users className="h-5 w-5" />{c.nickname}</button>
        ))}
        <button role="tab" aria-selected={tab === 'account'} onClick={() => setTab('account')} className={`btn !min-h-[44px] !py-2 !text-base ${tab === 'account' ? 'btn-purple' : 'btn-ghost'}`}><UserCog className="h-5 w-5" />Account & privacy</button>
      </div>

      {tab !== 'account' && kid && (
        <>
          <div className="flex gap-2" role="tablist">
            {[['progress', 'Learning progress'], ['ai', 'AstroBot controls']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`btn !min-h-[44px] !py-2 !text-base ${tab === k ? 'btn-blue' : 'btn-ghost'}`}>{l}</button>))}
          </div>
          {!report ? <Loading text="Loading report..." /> : tab === 'progress' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[['Level', `${report.child.level.level} · ${report.child.level.level_name}`], ['Total XP', report.child.total_xp], ['Missions done', `${kid.missions_completed}/5`], ['Planets explored', `${report.planets_explored}/9`]].map(([k, v]) => (
                  <div key={k} className="card !p-3 text-center"><p className="text-2xl font-black text-star">{v}</p><p className="text-sm font-extrabold">{k}</p></div>))}
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="card"><h2 className="mb-2 text-2xl font-black">Missions</h2>
                  <table className="w-full text-left text-base font-bold"><thead className="text-sm text-planet"><tr><th>Mission</th><th>Status</th><th>Tries</th><th>Best</th></tr></thead>
                    <tbody>{report.missions.map((m) => <tr key={m.code} className="border-t border-white/10"><td className="py-1.5">{m.title}</td><td className={m.completed ? 'text-mint' : 'text-white/60'}>{m.completed ? 'Complete' : 'Not yet'}</td><td>{m.attempts}</td><td>{m.best_score}</td></tr>)}</tbody></table>
                </section>
                <section className="card"><h2 className="mb-2 text-2xl font-black">Quiz performance</h2>
                  {report.quizzes.map((q) => (
                    <div key={q.title} className="mb-3"><div className="flex justify-between text-base font-extrabold"><span>{q.title}</span><span>{q.attempts ? `best ${q.best_percent}% · last ${q.last_percent}%` : 'not played'}</span></div>
                      <div className="mt-1 h-3 overflow-hidden rounded-full bg-navy-900"><div className="h-full rounded-full bg-galaxy" style={{ width: `${q.best_percent || 0}%` }} /></div>
                      <p className="text-sm font-bold text-white/60">{q.attempts} attempt{q.attempts === 1 ? '' : 's'}</p></div>))}
                </section>
                <section className="card"><h2 className="mb-2 flex items-center gap-2 text-2xl font-black"><Clock className="h-6 w-6" />Session history</h2>
                  {report.sessions.length === 0 ? <p className="font-bold text-white/70">No sessions yet.</p> : <ul className="max-h-64 divide-y divide-white/10 overflow-y-auto text-base font-bold">{report.sessions.map((s, i) => <li key={i} className="flex justify-between py-1.5"><span>{fmt(s.started_at)}</span><span className="text-planet">~{s.minutes} min</span></li>)}</ul>}
                </section>
                <section className="card"><h2 className="mb-2 text-2xl font-black">Recent activity</h2>
                  {report.recent_attempts.length === 0 ? <p className="font-bold text-white/70">No mission attempts yet.</p> : <ul className="max-h-64 divide-y divide-white/10 overflow-y-auto text-base font-bold">{report.recent_attempts.map((a, i) => <li key={i} className="py-1.5"><span>{a.mission}</span> <span className={a.success ? 'text-mint' : 'text-blush'}>{a.success ? 'success' : 'not yet'}</span> <span className="text-white/60">score {a.score}{a.xp ? ` · +${a.xp} XP` : ''}</span></li>)}</ul>}
                </section>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="card space-y-3"><h2 className="flex items-center gap-2 text-2xl font-black"><Bot className="h-7 w-7 text-planet" />AstroBot controls for {kid.nickname}</h2>
                <Toggle label="AstroBot chat" hint="Turn the whole chat on or off" checked={report.ai.settings.ai_enabled} onChange={(v) => setSetting({ ai_enabled: v })} />
                <Toggle label="Allow live AI answers" hint="Off = only curated, pre-written space answers" checked={report.ai.settings.ai_live_allowed} onChange={(v) => setSetting({ ai_live_allowed: v })} />
                <div className="rounded-2xl bg-white/5 p-3"><label htmlFor="lim" className="block text-lg font-extrabold">Questions allowed per day: {report.ai.settings.ai_daily_limit}</label>
                  <input id="lim" type="range" min={0} max={100} step={5} className="w-full accent-star" defaultValue={report.ai.settings.ai_daily_limit} onMouseUp={(e) => setSetting({ ai_daily_limit: Number(e.target.value) })} onTouchEnd={(e) => setSetting({ ai_daily_limit: Number(e.target.value) })} onKeyUp={(e) => setSetting({ ai_daily_limit: Number(e.target.value) })} /></div>
                <button className="btn btn-pink" onClick={async () => { if (window.confirm('Delete all saved AstroBot conversations for this child?')) { try { await api.parentClearAi(sel); setNote('Conversation history deleted.'); loadReport(sel) } catch (e) { fail(e) } } }}><Trash2 className="h-5 w-5" />Delete AstroBot history</button>
              </section>
              <section className="card"><h2 className="mb-2 text-2xl font-black">Usage (last days)</h2>
                {report.ai.days.length === 0 ? <p className="font-bold text-white/70">No questions asked yet.</p> : <ul className="divide-y divide-white/10 text-base font-bold">{report.ai.days.map((d) => <li key={d.date} className="flex justify-between py-1.5"><span>{fmtDay(d.date)}</span><span>{d.messages} question{d.messages === 1 ? '' : 's'}{d.blocked ? <span className="text-blush"> · {d.blocked} blocked</span> : null}</span></li>)}</ul>}
                <h3 className="mb-1 mt-4 text-xl font-black">Recent questions</h3>
                {report.ai.recent_questions.length === 0 ? <p className="font-bold text-white/70">Nothing to show.</p> : <ul className="space-y-1 text-base font-bold">{report.ai.recent_questions.map((q, i) => <li key={i} className={q.flagged ? 'text-blush' : ''}>{q.flagged ? '[flagged] ' : ''}{q.question}</li>)}</ul>}
              </section>
            </div>
          )}
        </>
      )}

      {tab === 'account' && <AccountPanel overview={overview} onDone={loadOverview} fail={fail} logout={logout} setChildId={setChildId} childId={childId} />}
    </div>
  )
}

function AccountPanel({ overview, onDone, fail, logout }) {
  const [name, setName] = useState(overview.parent.display_name)
  const [cur, setCur] = useState(''); const [nw, setNw] = useState('')
  const [msg, setMsg] = useState('')
  const run = async (fn, ok) => { setMsg(''); try { await fn(); setMsg(ok) } catch (e) { if ([401, 403].includes(e.response?.status)) fail(e); else setMsg(errorMessage(e)) } }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card space-y-3"><h2 className="text-2xl font-black">Account</h2>
        <p className="text-lg font-bold">Email: {overview.parent.email}</p>
        <label className="label" htmlFor="dn">Display name</label><input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className="btn btn-blue" onClick={() => run(async () => { await api.parentUpdateAccount({ display_name: name }); onDone() }, 'Name updated.')}>Save name</button>
        <h3 className="pt-2 text-xl font-black"><KeyRound className="mr-1 inline h-5 w-5" />Change password</h3>
        <input type="password" className="input" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <input type="password" className="input" placeholder="New password (8+ characters, letters and numbers)" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" />
        <button className="btn btn-yellow" onClick={() => run(async () => { await api.parentChangePassword({ current_password: cur, new_password: nw }); await logout() }, 'Password changed. Logging out...')}>Change password</button>
        {msg && <p className="rounded-2xl bg-white/10 p-2 text-base font-extrabold" role="status">{msg}</p>}
      </section>
      <section className="card space-y-3"><h2 className="text-2xl font-black">Privacy</h2>
        <ul className="list-disc space-y-1 pl-6 text-lg font-bold">
          <li>We only store your email and your child's nickname and age group.</li>
          <li>There is no chat with other people and no public profiles.</li>
          <li>AstroBot questions are saved so you can review them. You can delete them any time.</li>
          <li>AstroBot never asks for personal information and blocks it if typed.</li>
        </ul>
        <h3 className="pt-2 text-xl font-black text-blush">Delete an astronaut</h3>
        {overview.children.map((c) => (
          <button key={c.id} className="btn btn-ghost mr-2 !text-base" onClick={() => { if (window.confirm(`Permanently delete ${c.nickname} and all progress? This cannot be undone.`)) run(async () => { await api.parentDeleteChild(c.id); await onDone(); window.location.assign('/who') }, 'Deleted.') }}><Trash2 className="h-5 w-5" />Delete {c.nickname}</button>
        ))}
      </section>
    </div>
  )
}
