import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Download, Lock, Rocket, Star } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api, errorMessage } from '../services/api'
import { ErrorBox, Loading, PageTitle, Spinner } from '../components/ui'
import { sfx } from '../utils/sound'

export default function Certificate() {
  const { childId, profile, refreshProfile } = useApp()
  const [st, setSt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = () => api.certStatus(childId).then(setSt).catch((e) => setError(errorMessage(e)))
  useEffect(() => { load() }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  const issue = async () => {
    setBusy(true); setError('')
    try { setSt(await api.certIssue(childId)); await refreshProfile(); sfx.win() } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  const download = async () => {
    setBusy(true); setError('')
    try {
      const blob = await api.certPdf(childId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `Junior-Astronaut-${profile?.nickname || 'Certificate'}.pdf`
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (e) { setError(errorMessage(e, 'Could not download the certificate.')) } finally { setBusy(false) }
  }

  if (!st) return error ? <ErrorBox message={error} /> : <Loading text="Checking your missions..." />
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle icon={Award} title="Junior Astronaut Certificate" subtitle="Your official academy certificate" />
      <ErrorBox message={error} />
      <div className="card text-center">
        {/* Certificate preview */}
        <div className="relative mx-auto overflow-hidden rounded-3xl border-4 border-star p-6" style={{ background: 'linear-gradient(160deg,#101C3D,#2A1F5E)', opacity: st.eligible ? 1 : 0.55 }}>
          <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-galaxy" /><div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-planet" />
          <Rocket className="absolute right-4 top-4 h-10 w-10 rotate-45 text-blush" /><Star className="absolute bottom-4 left-6 h-8 w-8 fill-star text-star" />
          <p className="relative text-base font-extrabold text-planet">ASTROKIDS ACADEMY</p>
          <h2 className="relative text-3xl font-black text-star md:text-4xl">Junior Astronaut Certificate</h2>
          <p className="relative mt-3 text-lg font-bold">Proudly awarded to</p>
          <p className="relative text-4xl font-black text-blush md:text-5xl">{profile?.nickname}</p>
          <p className="relative mt-2 text-lg font-bold">for completing all astronaut training missions</p>
          <div className="relative mt-3 flex flex-wrap justify-center gap-2 text-base font-extrabold">
            <span className="rounded-full bg-galaxy/30 px-3 py-1">{profile?.level?.level_name}</span>
            <span className="rounded-full bg-star/30 px-3 py-1">{profile?.total_xp} XP</span>
            {st.issued_at && <span className="rounded-full bg-mint/30 px-3 py-1">{new Date(st.issued_at + 'Z').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          </div>
        </div>

        {!st.eligible ? (
          <div className="mt-5 space-y-3">
            <p className="flex items-center justify-center gap-2 text-xl font-extrabold"><Lock className="h-6 w-6 text-blush" />Locked: {st.missions_completed} of {st.missions_required} missions complete</p>
            <div className="mx-auto h-4 max-w-md overflow-hidden rounded-full bg-navy-900"><div className="h-full rounded-full bg-planet" style={{ width: `${(st.missions_completed / st.missions_required) * 100}%` }} /></div>
            <Link to="/missions" className="btn btn-yellow">Go to missions</Link>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {!st.issued ? <button className="btn btn-yellow" onClick={issue} disabled={busy}>{busy ? <Spinner /> : <Award className="h-6 w-6" />}Generate my certificate</button>
              : <>
                <button className="btn btn-yellow" onClick={download} disabled={busy}>{busy ? <Spinner /> : <Download className="h-6 w-6" />}Download PDF</button>
                <button className="btn btn-ghost" onClick={issue} disabled={busy}>Update with my latest XP</button>
              </>}
          </div>
        )}
        {st.certificate_code && <p className="mt-3 text-sm font-bold text-white/60">Certificate code {st.certificate_code}</p>}
      </div>
    </div>
  )
}
