import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Bot, Mic, MicOff, Send, Sparkles, Trash2, Volume2, VolumeX } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api, errorMessage } from '../services/api'
import AstroBotMascot from '../components/AstroBotMascot'
import { ErrorBox, Loading } from '../components/ui'
import { speak, stopSpeaking, sfx } from '../utils/sound'

const GREETING = { id: 'hello', role: 'bot', text: "Beep boop! I'm AstroBot, your space robot buddy! Ask me anything about planets, rockets, astronauts or stars. Tap a question below to start!", mode: 'greeting' }
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

function Bubble({ m, typing }) {
  const bot = m.role === 'bot'
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${bot ? 'justify-start' : 'justify-end'}`}>
      {bot && <div className="hidden h-12 w-12 shrink-0 overflow-hidden rounded-full bg-navy-700 sm:block"><AstroBotMascot size={52} className="-mt-1" /></div>}
      <div className={`max-w-[85%] rounded-3xl px-5 py-3 text-lg font-bold leading-snug shadow ${bot ? 'rounded-tl-md bg-planet text-navy' : 'rounded-tr-md bg-star text-navy'}`}>
        {m.text}{typing && <span className="ml-0.5 inline-block animate-pulse">|</span>}
        {bot && m.mode === 'demo' && <p className="mt-2 flex items-center gap-1 text-xs font-extrabold text-navy/70"><BookOpen className="h-4 w-4" />Curated educational answer (demo mode), not a live AI response</p>}
        {bot && m.mode === 'live' && <p className="mt-2 flex items-center gap-1 text-xs font-extrabold text-navy/70"><Sparkles className="h-4 w-4" />Live AI answer</p>}
        {m.notice && <p className="mt-1 text-xs font-extrabold text-navy/70">{m.notice}</p>}
      </div>
    </motion.div>
  )
}

export default function AstroBotPage() {
  const { childId, profile, showReward, refreshProfile } = useApp()
  const [status, setStatus] = useState(null)
  const [usage, setUsage] = useState(null)
  const [msgs, setMsgs] = useState([GREETING])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [typingId, setTypingId] = useState(null)
  const [error, setError] = useState('')
  const [voice, setVoice] = useState(false)
  const [listening, setListening] = useState(false)
  const end = useRef(null)
  const recog = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    Promise.all([api.astrobotStatus(), api.astrobotUsage(childId)]).then(([s, u]) => { setStatus(s); setUsage(u) }).catch((e) => setError(errorMessage(e)))
    return () => { clearInterval(timer.current); stopSpeaking(); recog.current?.stop?.() }
  }, [childId])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, thinking])

  const typeOut = (id, full) => {
    clearInterval(timer.current)
    let n = 0
    setTypingId(id)
    timer.current = setInterval(() => {
      n += 3
      setMsgs((ms) => ms.map((m) => (m.id === id ? { ...m, text: full.slice(0, n) } : m)))
      if (n >= full.length) { clearInterval(timer.current); setTypingId(null) }
    }, 22)
  }

  const send = async (text) => {
    const q = (text ?? input).trim()
    if (!q || thinking) return
    setInput(''); setError(''); sfx.click()
    const history = msgs.filter((m) => m.id !== 'hello' && m.mode !== 'safety').slice(-6).map((m) => ({ role: m.role === 'bot' ? 'bot' : 'child', content: m.text }))
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'child', text: q }])
    setThinking(true)
    try {
      const r = await api.astrobotChat(childId, q, history)
      const id = `b${Date.now()}`
      setMsgs((m) => [...m, { id, role: 'bot', text: '', mode: r.mode, notice: r.notice }])
      setThinking(false)
      typeOut(id, r.answer)
      if (voice) speak(r.answer)
      setUsage((u) => (u ? { ...u, remaining: r.remaining, used_today: u.daily_limit - r.remaining } : u))
      if (r.daily_bonus > 0) showReward({ xp_earned: 0, daily_bonus: r.daily_bonus, new_badges: [], total_xp: 0, level: {} }, { title: 'Daily challenge done!' })
      else refreshProfile()
    } catch (e) {
      setThinking(false)
      setError(errorMessage(e, 'AstroBot lost his signal. Please try again in a moment.'))
      if (e.response?.status === 429 || e.response?.status === 403) setInput('')
    }
  }

  const clear = () => { clearInterval(timer.current); stopSpeaking(); setTypingId(null); setMsgs([GREETING]); setError('') }
  const toggleVoice = () => { if (voice) stopSpeaking(); setVoice((v) => !v) }
  const listen = () => {
    if (!SR) return
    if (listening) { recog.current?.stop(); return }
    const r = new SR(); r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1
    r.onresult = (e) => { const t = e.results[0][0].transcript; setInput(t.slice(0, 300)) }
    r.onend = () => setListening(false); r.onerror = () => setListening(false)
    recog.current = r; setListening(true); try { r.start() } catch { setListening(false) }
  }

  if (!status && !error) return <Loading text="Waking up AstroBot..." />
  const disabled = usage && (!usage.enabled || usage.remaining <= 0)
  const live = usage ? usage.mode === 'live' : status?.mode === 'live'

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <AstroBotMascot size={110} talking={typingId !== null} thinking={thinking} />
        <div className="flex-1">
          <h1 className="text-3xl font-black md:text-4xl">AstroBot <span className="text-planet">space helper</span></h1>
          <p className="text-lg font-bold text-white/80">Ask me anything about space!</p>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-extrabold ${live ? 'bg-mint/25 text-mint' : 'bg-star/25 text-star'}`}>
            {live ? <><Sparkles className="h-4 w-4" />Live AI mode</> : <><BookOpen className="h-4 w-4" />Demo mode: curated answers</>}
          </span>
          {usage && usage.enabled && <span className="ml-2 text-sm font-bold text-white/70">{usage.remaining} questions left today</span>}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost !min-h-[44px] !px-3" onClick={toggleVoice} aria-pressed={voice} aria-label="Read answers aloud">{voice ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>
          <button className="btn btn-ghost !min-h-[44px] !px-3" onClick={clear} aria-label="Clear chat"><Trash2 className="h-5 w-5" /><span className="hidden sm:inline text-base">Clear</span></button>
        </div>
      </div>

      <div className="card flex h-[52vh] min-h-[20rem] flex-col gap-3 overflow-y-auto" role="log" aria-live="polite" aria-label="Chat with AstroBot">
        {msgs.map((m) => <Bubble key={m.id} m={m} typing={m.id === typingId} />)}
        {thinking && (
          <div className="flex items-center gap-2" role="status"><div className="rounded-3xl rounded-tl-md bg-planet px-5 py-3 text-navy"><span className="inline-flex gap-1">{[0, 1, 2].map((i) => <motion.span key={i} className="h-3 w-3 rounded-full bg-navy" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}</span></div><span className="text-base font-bold text-white/70">AstroBot is thinking...</span></div>
        )}
        <div ref={end} />
      </div>

      <ErrorBox message={error} />
      {usage && !usage.enabled && <p className="mt-3 rounded-2xl bg-star/20 p-3 text-lg font-extrabold text-star">AstroBot is resting. Ask a grown-up to turn him on in the Parent area.</p>}

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested questions">
        {(status?.suggestions || []).map((s) => (
          <button key={s} className="rounded-full border-2 border-galaxy/60 bg-galaxy/15 px-4 py-2 text-base font-extrabold transition hover:bg-galaxy/30 disabled:opacity-50" disabled={thinking || disabled} onClick={() => send(s)}>{s}</button>
        ))}
      </div>

      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send() }}>
        <input className="input flex-1" value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} disabled={disabled}
          placeholder="Type your space question..." aria-label="Your question" />
        {SR && <button type="button" className={`btn ${listening ? 'btn-pink animate-pulse' : 'btn-ghost'} !px-4`} onClick={listen} aria-label={listening ? 'Stop listening' : 'Speak your question'}>{listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}</button>}
        <button className="btn btn-yellow !px-6" disabled={thinking || disabled || !input.trim()} aria-label="Send question"><Send className="h-6 w-6" /><span className="hidden sm:inline">Ask</span></button>
      </form>
      <p className="mt-2 flex items-center gap-1 text-sm font-bold text-white/60"><Bot className="h-4 w-4" />Never share your name, address, school or phone number with anyone online - not even robots!</p>
    </div>
  )
}
