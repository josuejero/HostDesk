import { useState, type FormEvent } from 'react'

type Props = {
  onLogin: (payload: { email: string; password: string }) => Promise<unknown>
  onRegister: (payload: { email: string; password: string; displayName: string }) => Promise<unknown>
  sessionError?: string | null
}

const AuthShell = ({ onLogin, onRegister, sessionError }: Props) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('demo@hostdesk.local')
  const [password, setPassword] = useState('Password123!')
  const [displayName, setDisplayName] = useState('HostDesk Demo')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    try {
      if (mode === 'login') {
        await onLogin({ email, password })
      } else {
        await onRegister({ email, password, displayName })
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to continue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">HostDesk secure workspace</p>
        <h1>{mode === 'login' ? 'Sign in to your saved pipeline' : 'Create a seeded workspace'}</h1>
        <p className="hero-blurb">
          {mode === 'login'
            ? 'Your queue, notes, follow-ups, and stage history now load from the PHP/MySQL API.'
            : 'Registration creates a personal copy of the HostDesk demo scenarios so the portfolio flow still works on first launch.'}
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label className="utility-field">
              <span>Display name</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
          )}
          <label className="utility-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="utility-field">
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {(formError || sessionError) && <p className="auth-error">{formError || sessionError}</p>}
          <div className="auth-actions">
            <button type="submit" className="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
              disabled={isSubmitting}
            >
              {mode === 'login' ? 'Need an account?' : 'Have an account?'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default AuthShell
