import { useState } from 'react'
import { appointmentApi, patientApi, doctorApi, usePaged, useAll } from '../api.js'
import Pagination from './Pagination.jsx'

const EMPTY = { patientId: '', doctorId: '', appointmentDate: '', status: 'BOOKED' }
const SORT_OPTIONS = [
  { value: 'id,asc', label: 'ID (asc)' },
  { value: 'appointmentDate,asc', label: 'Date (asc)' },
  { value: 'appointmentDate,desc', label: 'Date (desc)' },
  { value: 'status,asc', label: 'Status' },
]

export default function Appointments() {
  const { pageData, page, setPage, sort, changeSort, loading, error, reload } = usePaged(appointmentApi.list)
  const { items: patients } = useAll(patientApi.list)
  const { items: doctors } = useAll(doctorApi.list)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState(null)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setFormError(null)
    const payload = {
      patientId: form.patientId ? Number(form.patientId) : null,
      doctorId: form.doctorId ? Number(form.doctorId) : null,
      appointmentDate: form.appointmentDate,
      status: form.status,
    }
    try {
      if (editingId) await appointmentApi.update(editingId, payload)
      else await appointmentApi.create(payload)
      setForm(EMPTY)
      setEditingId(null)
      reload()
    } catch (err) {
      // Surfaces the Feign validation message, e.g. "Patient not found with ID: 999"
      setFormError(err.message)
    }
  }

  const edit = (a) => {
    setEditingId(a.id)
    setForm({ patientId: a.patientId, doctorId: a.doctorId, appointmentDate: a.appointmentDate, status: a.status })
  }

  const remove = async (id) => {
    if (!confirm('Delete this appointment?')) return
    await appointmentApi.remove(id)
    reload()
  }

  const nameById = (list, id, field) => {
    const found = list.find((x) => x.id === id)
    return found ? `${found[field]} (#${id})` : `#${id}`
  }

  return (
    <div>
      <div className="card">
        <h2>{editingId ? 'Edit Appointment' : 'Book Appointment'}</h2>
        <p className="muted">Patient &amp; doctor are validated via Feign before booking.</p>
        {formError && <div className="alert error">{formError}</div>}
        <form onSubmit={submit} className="form-row">
          <div className="field"><label>Patient</label>
            <select name="patientId" value={form.patientId} onChange={onChange} required>
              <option value="">Select patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name} (#{p.id})</option>)}
            </select></div>
          <div className="field"><label>Doctor</label>
            <select name="doctorId" value={form.doctorId} onChange={onChange} required>
              <option value="">Select doctor</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} (#{d.id})</option>)}
            </select></div>
          <div className="field"><label>Date</label>
            <input name="appointmentDate" type="date" value={form.appointmentDate} onChange={onChange} required /></div>
          <div className="field"><label>Status</label>
            <select name="status" value={form.status} onChange={onChange}>
              <option>BOOKED</option><option>COMPLETED</option><option>CANCELLED</option>
            </select></div>
          <button className="btn" type="submit">{editingId ? 'Update' : 'Book'}</button>
          {editingId && (
            <button type="button" className="btn secondary"
              onClick={() => { setEditingId(null); setForm(EMPTY) }}>Cancel</button>
          )}
        </form>
      </div>

      <div className="card">
        <h2>Appointments ({pageData.totalElements})</h2>
        {loading && <div className="spinner">Loading…</div>}
        {error && <div className="alert error">{error}</div>}
        {!loading && !error && (
          <>
            <table>
              <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {pageData.content.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id}</td>
                    <td>{nameById(patients, a.patientId, 'name')}</td>
                    <td>{nameById(doctors, a.doctorId, 'name')}</td>
                    <td>{a.appointmentDate}</td>
                    <td><span className={`badge ${(a.status || '').toLowerCase()}`}>{a.status}</span></td>
                    <td>
                      <button className="link edit" onClick={() => edit(a)}>Edit</button>
                      <button className="link delete" onClick={() => remove(a.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {pageData.content.length === 0 && <tr><td colSpan="6" className="muted">No appointments yet.</td></tr>}
              </tbody>
            </table>
            <Pagination pageData={pageData} setPage={setPage} sort={sort} changeSort={changeSort} sortOptions={SORT_OPTIONS} />
          </>
        )}
      </div>
    </div>
  )
}
