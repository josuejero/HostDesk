import DeskApp from './app/DeskApp'
import AuthShell from './app/components/auth/AuthShell'
import { useSession } from './api/hooks'

const App = () => {
  const { session, isLoading, error, login, register, logout } = useSession()

  if (isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">HostDesk</p>
          <h1>Loading your workspace</h1>
          <p className="hero-blurb">Checking the current PHP session and loading saved sales-ops data.</p>
        </section>
      </main>
    )
  }

  if (!session.authenticated) {
    return <AuthShell onLogin={login} onRegister={register} sessionError={error} />
  }

  return <DeskApp session={session} onLogout={() => void logout()} />
}

export default App
