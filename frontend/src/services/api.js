import axios from 'axios'

const TOKEN_KEY = 'astrokids.token'
const GATE_KEY = 'astrokids.gate'

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } },
  getGate: () => { try { return sessionStorage.getItem(GATE_KEY) } catch { return null } },
  setGate: (t) => { try { t ? sessionStorage.setItem(GATE_KEY, t) : sessionStorage.removeItem(GATE_KEY) } catch { /* ignore */ } },
}

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || '', timeout: 30000 })

http.interceptors.request.use((cfg) => {
  const useGate = cfg.url?.startsWith('/api/parent')
  const t = useGate ? tokenStore.getGate() : tokenStore.get()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || ''
    if (err.response?.status === 401 && !url.includes('/api/auth/login') && !url.includes('parent-gate')) {
      if (url.startsWith('/api/parent')) tokenStore.setGate(null)
      else onUnauthorized?.()
    }
    return Promise.reject(err)
  },
)

/** Turn any error into a short friendly sentence. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error')
    return 'Cannot reach the space station (the backend server). Is it running on port 8000?'
  if (err.code === 'ECONNABORTED') return 'That took too long. Please try again.'
  const d = err.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x.msg).join('; ')
  return fallback
}

const d = (p) => p.then((r) => r.data)
const C = (id) => `/api/children/${id}`

export const api = {
  register: (b) => d(http.post('/api/auth/register', b)),
  login: (b) => d(http.post('/api/auth/login', b)),
  logout: () => d(http.post('/api/auth/logout')),
  me: () => d(http.get('/api/auth/me')),
  parentGate: (password) => d(http.post('/api/auth/parent-gate', { password })),
  addChild: (b) => d(http.post('/api/children', b)),

  profile: (id) => d(http.get(`${C(id)}/profile`)),
  saveAvatar: (id, b) => d(http.put(`${C(id)}/avatar`, b)),
  xpHistory: (id) => d(http.get(`${C(id)}/xp-history`)),
  startSession: (id) => d(http.post(`${C(id)}/session`)),

  nasaApod: () => d(http.get('/api/nasa/apod')),
  planets: () => d(http.get('/api/planets')),
  visitedPlanets: (id) => d(http.get(`${C(id)}/planets/visited`)),
  explorePlanet: (id, slug) => d(http.post(`${C(id)}/planets/${slug}/explore`)),

  missions: () => d(http.get('/api/missions')),
  mission: (code) => d(http.get(`/api/missions/${code}`)),
  missionProgress: (id) => d(http.get(`${C(id)}/missions/progress`)),
  missionHistory: (id) => d(http.get(`${C(id)}/missions/history`)),
  missionCheck: (id, code, b) => d(http.post(`${C(id)}/missions/${code}/check`, b)),
  missionComplete: (id, code, result) => d(http.post(`${C(id)}/missions/${code}/complete`, { result })),

  quizzes: () => d(http.get('/api/quizzes')),
  quiz: (slug) => d(http.get(`/api/quizzes/${slug}`)),
  quizBest: (id) => d(http.get(`${C(id)}/quizzes/best`)),
  quizSubmit: (id, slug, answers) => d(http.post(`${C(id)}/quizzes/${slug}/submit`, { answers })),

  rocketParts: () => d(http.get('/api/rocket/parts')),
  rocketValidate: (id, b) => d(http.post(`${C(id)}/rocket/validate`, b)),
  rocketSave: (id, b) => d(http.post(`${C(id)}/rocket/builds`, b)),
  rocketBuilds: (id) => d(http.get(`${C(id)}/rocket/builds`)),
  rocketLaunch: (id, b) => d(http.post(`${C(id)}/rocket/launch`, b)),

  astrobotStatus: () => d(http.get('/api/astrobot/status')),
  astrobotUsage: (id) => d(http.get(`${C(id)}/astrobot/usage`)),
  astrobotChat: (id, message, history) => d(http.post(`${C(id)}/astrobot/chat`, { message, history })),

  badges: (id) => d(http.get(`${C(id)}/badges`)),
  certStatus: (id) => d(http.get(`${C(id)}/certificate`)),
  certIssue: (id) => d(http.post(`${C(id)}/certificate`)),
  certPdf: async (id) => (await http.get(`${C(id)}/certificate/pdf`, { responseType: 'blob' })).data,
  daily: (id) => d(http.get(`${C(id)}/daily`)),

  parentOverview: () => d(http.get('/api/parent/overview')),
  parentReport: (id) => d(http.get(`/api/parent/children/${id}/report`)),
  parentSettings: (id, b) => d(http.put(`/api/parent/children/${id}/settings`, b)),
  parentClearAi: (id) => d(http.delete(`/api/parent/children/${id}/ai-history`)),
  parentDeleteChild: (id) => d(http.delete(`/api/parent/children/${id}`)),
  parentAccount: () => d(http.get('/api/parent/account')),
  parentUpdateAccount: (b) => d(http.put('/api/parent/account', b)),
  parentChangePassword: (b) => d(http.post('/api/parent/change-password', b)),
}
