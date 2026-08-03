import { useState } from 'react'

const PASSWORD = 'noroff2025'
const STORAGE_KEY = 'fed_auth'

export function useAuth() {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  return stored === 'true'
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'true')
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      setAuthed(true)
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 2000)
    }
  }

  if (authed) return <>{children}</>

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">FED Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Enter the access code to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Access code"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl bg-gray-900 border text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-800 focus:ring-indigo-500'
            }`}
          />
          {error && (
            <p className="text-red-400 text-xs text-center">Incorrect code. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
