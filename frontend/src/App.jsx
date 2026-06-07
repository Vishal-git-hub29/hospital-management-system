import { useState } from 'react'
import Patients from './components/Patients.jsx'
import Doctors from './components/Doctors.jsx'
import Appointments from './components/Appointments.jsx'
import Bills from './components/Bills.jsx'
import Auth from './components/Auth.jsx'

const TABS = [
  { key: 'patients', label: 'Patients', Component: Patients },
  { key: 'doctors', label: 'Doctors', Component: Doctors },
  { key: 'appointments', label: 'Appointments', Component: Appointments },
  { key: 'bills', label: 'Bills', Component: Bills },
]

const AUTH_KEY = 'hms-auth'

export default function App() {
  // Restore the session from localStorage so a refresh keeps you logged in.
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(AUTH_KEY)
    return saved ? JSON.parse(saved) : null
  })
  const [active, setActive] = useState('patients')

  const handleLogin = (data) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data))
    setAuth(data)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_KEY)
    setAuth(null)
  }

  // Not logged in → show the login / register screen.
  if (!auth) return <Auth onLogin={handleLogin} />

  const ActiveComponent = TABS.find((t) => t.key === active).Component

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🏥 Hospital Management System</h1>
        </div>
        <div className="user-box">
          <span className="muted">{auth.fullName || auth.email}</span>
          <button className="btn small secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${active === t.key ? 'active' : ''}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        <ActiveComponent />
      </main>
    </div>
  )
}
