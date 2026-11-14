import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from '../services/api'
import { loadPrefs, savePrefs } from '../utils/settings'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const CHILD_KEY = 'astrokids.child'

export function AppProvider({ children }) {
  const [parent, setParent] = useState(null)
  const [kids, setKids] = useState([])
  const [childId, setChildId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [booting, setBooting] = useState(!!tokenStore.get())
  const [reward, setReward] = useState(null)
  const [prefs, setPrefsState] = useState(loadPrefs)

  const setPrefs = useCallback((patch) => {
    setPrefsState((p) => { const n = { ...p, ...patch }; savePrefs(n); return n })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', !!prefs.reduceMotion)
  }, [prefs.reduceMotion])

  const clearSession = useCallback(() => {
    tokenStore.set(null); tokenStore.setGate(null)
    setParent(null); setKids([]); setChildId(null); setProfile(null)
  }, [])

  useEffect(() => { setUnauthorizedHandler(clearSession) }, [clearSession])

  const loadAccount = useCallback(async () => {
    const me = await api.me()
    setParent({ id: me.id, email: me.email, display_name: me.display_name })
    setKids(me.children)
    let saved = null
    try { saved = Number(localStorage.getItem(CHILD_KEY)) } catch { /* ignore */ }
    const pick = me.children.find((c) => c.id === saved) || (me.children.length === 1 ? me.children[0] : null)
    setChildId(pick ? pick.id : null)
    return me
  }, [])

  useEffect(() => {
    if (!tokenStore.get()) { setBooting(false); return }
    loadAccount().catch(() => clearSession()).finally(() => setBooting(false))
  }, [loadAccount, clearSession])

  const refreshProfile = useCallback(async (id = childId) => {
    if (!id) { setProfile(null); return null }
    const p = await api.profile(id)
    setProfile(p)
    setKids((ks) => ks.map((k) => (k.id === id ? { ...k, nickname: p.nickname, avatar: p.avatar, total_xp: p.total_xp, level: p.level } : k)))
    return p
  }, [childId])

  useEffect(() => {
    if (childId) {
      try { localStorage.setItem(CHILD_KEY, String(childId)) } catch { /* ignore */ }
      refreshProfile(childId).catch(() => {})
      api.startSession(childId).catch(() => {})
    } else setProfile(null)
  }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const t = await api.login({ email, password })
    tokenStore.set(t.access_token)
    await loadAccount()
  }
  const register = async (body) => {
    const t = await api.register(body)
    tokenStore.set(t.access_token)
    await loadAccount()
  }
  const logout = async () => {
    try { await api.logout() } catch { /* token may already be invalid */ }
    clearSession()
  }
  const addChild = async (nickname, age_group) => {
    const c = await api.addChild({ nickname, age_group })
    await loadAccount()
    setChildId(c.id)
    return c
  }

  /** Call with any server reward summary; shows celebration if there is something to celebrate. */
  const showReward = useCallback((r, extra = {}) => {
    if (!r) return
    refreshProfile().catch(() => {})
    if ((r.xp_earned || 0) + (r.daily_bonus || 0) > 0 || r.new_badges?.length || r.leveled_up) setReward({ ...r, ...extra })
  }, [refreshProfile])

  const value = useMemo(() => ({
    parent, kids, childId, setChildId, profile, booting, login, register, logout, addChild,
    refreshProfile, reward, showReward, closeReward: () => setReward(null), prefs, setPrefs, loadAccount,
  }), [parent, kids, childId, profile, booting, reward, prefs]) // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
