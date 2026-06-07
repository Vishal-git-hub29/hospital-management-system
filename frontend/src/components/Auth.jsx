import { useState } from 'react'
import { authApi } from '../api.js'

const EMPTY = { fullName: '', email: '', password: '' }

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const switchMode = (m) => {
    setMode(m)
    setForm(EMPTY)
    setError(null)
    setFieldErrors({})
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setLoading(true)
    try {
      const res =
        mode === 'register'
          ? await authApi.register(form)
          : await authApi.login({ email: form.email, password: form.password })
      onLogin(res)
    } catch (err) {
      // Per-field validation errors come back as err.data.errors
      if (err.data?.errors) setFieldErrors(err.data.errors)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-shell">
        <aside className="auth-brand">
          <div className="brand-logo">🏥</div>
          <h1 className="brand-title">Hospital Management System</h1>
          <p className="brand-tag">Secure access for staff to manage care, end to end.</p>
          <ul className="brand-features">
            <li><span>👤</span> Patient &amp; doctor records</li>
            <li><span>📅</span> Appointment scheduling</li>
            <li><span>💳</span> Automated billing</li>
            <li><span>🔒</span> Secure sign-in</li>
          </ul>
        </aside>

      <div className="auth-card">
        <h2 className="auth-heading">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="auth-sub">{mode === 'login' ? 'Sign in to continue' : 'Register to get started'}</p>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Register</button>
        </div>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="auth-field">
              <label>Full Name</label>
              <input name="fullName" value={form.fullName} onChange={onChange} />
              {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange} placeholder="you@gmail.com" />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={onChange} />
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            {mode === 'register' && !fieldErrors.password && (
              <span className="hint">
                Min 8 chars, with uppercase, lowercase, a digit, and a special character (@$!%*?&#).
              </span>
            )}
          </div>

          <button className="btn auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>No account? <button className="link edit" onClick={() => switchMode('register')}>Register</button></>
          ) : (
            <>Already have an account? <button className="link edit" onClick={() => switchMode('login')}>Login</button></>
          )}
        </p>
      </div>
      </div>
    </div>
  )
}
