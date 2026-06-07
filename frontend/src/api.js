// Thin REST layer over the five backend services.
// Base URLs come from Vite env vars (see .env.example) with localhost defaults.
import { useCallback, useEffect, useState } from 'react'

const BASE = {
  patient: import.meta.env.VITE_PATIENT_API || 'http://localhost:8081',
  doctor: import.meta.env.VITE_DOCTOR_API || 'http://localhost:8083',
  appointment: import.meta.env.VITE_APPOINTMENT_API || 'http://localhost:8084',
  billing: import.meta.env.VITE_BILLING_API || 'http://localhost:8085',
  auth: import.meta.env.VITE_AUTH_API || 'http://localhost:8086',
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    // Backend returns a JSON error body ({ message, status, errors? })
    let body
    try {
      body = await res.json()
    } catch {
      body = { message: await res.text() }
    }
    const err = new Error(body.message || `Request failed (${res.status})`)
    err.data = body // may carry per-field { errors: { email: "...", password: "..." } }
    throw err
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// Builds ?page=&size=&sort= for the paginated list endpoints.
function pageQuery({ page = 0, size = 5, sort = 'id,asc' } = {}) {
  const q = new URLSearchParams({ page, size, sort })
  return q.toString()
}

// ---- Auth (port 8086) ----
export const authApi = {
  register: (data) => request(`${BASE.auth}/auth/register`, { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request(`${BASE.auth}/auth/login`, { method: 'POST', body: JSON.stringify(data) }),
}

// ---- Patients (port 8081) ----
export const patientApi = {
  list: (p) => request(`${BASE.patient}/patients?${pageQuery(p)}`),
  create: (d) => request(`${BASE.patient}/patients`, { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`${BASE.patient}/patients/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`${BASE.patient}/patients/${id}`, { method: 'DELETE' }),
  search: ({ name, age, department }) => {
    const q = new URLSearchParams()
    if (name) q.set('name', name)
    if (age) q.set('age', age)
    if (department) q.set('department', department)
    return request(`${BASE.patient}/patients/search?${q.toString()}`)
  },
}

// ---- Doctors (port 8083) ----
export const doctorApi = {
  list: (p) => request(`${BASE.doctor}/doctors?${pageQuery(p)}`),
  create: (d) => request(`${BASE.doctor}/doctors`, { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`${BASE.doctor}/doctors/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`${BASE.doctor}/doctors/${id}`, { method: 'DELETE' }),
}

// ---- Appointments (port 8084) ----
export const appointmentApi = {
  list: (p) => request(`${BASE.appointment}/appointments?${pageQuery(p)}`),
  create: (a) => request(`${BASE.appointment}/appointments`, { method: 'POST', body: JSON.stringify(a) }),
  update: (id, a) => request(`${BASE.appointment}/appointments/${id}`, { method: 'PUT', body: JSON.stringify(a) }),
  remove: (id) => request(`${BASE.appointment}/appointments/${id}`, { method: 'DELETE' }),
}

// ---- Bills (port 8085) ----
export const billingApi = {
  list: (p) => request(`${BASE.billing}/bills?${pageQuery(p)}`),
  updateStatus: (id, status) =>
    request(`${BASE.billing}/bills/${id}/status?status=${encodeURIComponent(status)}`, { method: 'PUT' }),
  remove: (id) => request(`${BASE.billing}/bills/${id}`, { method: 'DELETE' }),
}

/**
 * Custom Hook for the paginated + sortable list tables.
 * Manages page index and sort, refetches whenever they change, and exposes
 * the Spring Page payload ({ content, totalPages, number, totalElements }).
 */
export function usePaged(listFn, { size = 5, sort = 'id,asc' } = {}) {
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState(sort)
  const [pageData, setPageData] = useState({ content: [], totalPages: 0, number: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listFn({ page, size, sort: sortBy })
      setPageData(res || { content: [], totalPages: 0, number: 0, totalElements: 0 })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [listFn, page, size, sortBy])

  useEffect(() => {
    reload()
  }, [reload])

  // Reset to the first page whenever the sort changes.
  const changeSort = (value) => {
    setSortBy(value)
    setPage(0)
  }

  return { pageData, page, setPage, sort: sortBy, changeSort, loading, error, reload }
}

/**
 * Custom Hook that loads ALL rows of a resource (large page size) — used for
 * dropdowns and name lookups where pagination isn't wanted.
 */
export function useAll(listFn) {
  const [items, setItems] = useState([])
  const reload = useCallback(async () => {
    try {
      const res = await listFn({ page: 0, size: 1000, sort: 'id,asc' })
      setItems(Array.isArray(res) ? res : res?.content || [])
    } catch {
      setItems([])
    }
  }, [listFn])
  useEffect(() => {
    reload()
  }, [reload])
  return { items, reload }
}
