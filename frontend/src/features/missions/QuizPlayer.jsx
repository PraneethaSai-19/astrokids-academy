import { useEffect, useState } from 'react'
import { Check, X, ArrowRight, RotateCcw } from 'lucide-react'
import { api, errorMessage } from '../../services/api'
import { useApp } from '../../context/AuthContext'
import { ErrorBox, Loading } from '../../components/ui'
import { sfx } from '../../utils/sound'

/** Multiple-choice quiz. Questions come from the server; answers are scored by the server. */
export default function QuizPlayer({ slug, onClose, onDone }) {
  const { childId, showReward } = useApp()
  const [quiz, setQuiz] = useState(null)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState([])
  const [picked, setPicked] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.quiz(slug).then(setQuiz).catch((e) => setError(errorMessage(e))) }, [slug])
  if (!quiz) return error ? <ErrorBox message={error} /> : <Loading text="Loading quiz..." />

  const q = quiz.questions[i]
  const choose = (idx) => { if (picked !== null) return; sfx.click(); setPicked(idx) }
  const next = async () => {
    const all = [...answers, picked]
    if (i + 1 < quiz.questions.length) { setAnswers(all); setI(i + 1); setPicked(null); return }
    setBusy(true)
    try {
      const r = await api.quizSubmit(childId, slug, all)
      setResult(r); showReward(r, { title: 'Quiz complete!' }); onDone?.()
      r.percent >= 50 ? sfx.win() : sfx.bad()
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  const restart = () => { setI(0); setAnswers([]); setPicked(null); setResult(null) }

  if (result) {
    return (
      <div className="card space-y-4 text-center">
        <h2 className="text-3xl font-black text-star">{result.percent >= 80 ? 'Quiz Master!' : result.percent >= 50 ? 'Nice work!' : 'Good try!'}</h2>
        <p className="text-5xl font-black">{result.correct} / {result.total}</p>
        <p className="text-xl font-bold">{result.xp_earned > 0 ? `+${result.xp_earned} XP` : 'No new XP this time - beat your best score to earn more!'}</p>
        <ul className="space-y-2 text-left">
          {quiz.questions.map((qq, n) => (
            <li key={qq.id} className={`rounded-2xl p-3 ${result.review[n].correct ? 'bg-mint/15' : 'bg-blush/15'}`}>
              <p className="flex items-start gap-2 text-lg font-extrabold">{result.review[n].correct ? <Check className="mt-1 h-5 w-5 text-mint" /> : <X className="mt-1 h-5 w-5 text-blush" />}{qq.question}</p>
              <p className="ml-7 text-base font-bold text-white/80">Answer: {qq.options[result.review[n].correct_index]}. {result.review[n].explanation}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-center gap-3">
          <button className="btn btn-yellow" onClick={restart}><RotateCcw className="h-5 w-5" />Play again</button>
          <button className="btn btn-ghost" onClick={onClose}>Back to missions</button>
        </div>
      </div>
    )
  }
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black">{quiz.title}</h2><span className="text-lg font-extrabold text-planet">Question {i + 1} of {quiz.questions.length}</span></div>
      <p className="text-2xl font-black leading-snug">{q.question}</p>
      <ErrorBox message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        {q.options.map((o, idx) => (
          <button key={o} onClick={() => choose(idx)} aria-pressed={picked === idx}
            className={`rounded-2xl border-4 p-4 text-left text-lg font-extrabold transition ${picked === idx ? 'border-star bg-star/20' : 'border-white/20 bg-white/10 hover:bg-white/20'}`}>{o}</button>
        ))}
      </div>
      <div className="flex justify-between gap-3">
        <button className="btn btn-ghost" onClick={onClose}>Quit</button>
        <button className="btn btn-yellow" onClick={next} disabled={picked === null || busy}>{i + 1 < quiz.questions.length ? 'Next' : 'Finish'}<ArrowRight className="h-6 w-6" /></button>
      </div>
    </div>
  )
}
