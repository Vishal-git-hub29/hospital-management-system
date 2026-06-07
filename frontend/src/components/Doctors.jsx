import { useState } from 'react'
import { doctorApi, usePaged } from '../api.js'
import Pagination from './Pagination.jsx'

const EMPTY = { name: '', specialization: '', experience: '', phone: '' }
const SORT_OPTIONS = [
  { value: 'id,asc', label: 'ID (asc)' },
  { value: 'name,asc', label: 'Name (A–Z)' },
  { value: 'name,desc', label: 'Name (Z–A)' },
  { value: 'specialization,asc', label: 'Specialization' },
  { value: 'experience,desc', label: 'Experience (high→low)' },
]

export default function Doctors() {
  const { pageData, page, setPage, sort, changeSort, loading, error, reload } = usePaged(doctorApi.list)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState(null)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setFormError(null)
    const payload = { ...form, experience: form.experience ? Number(form.experience) : null }
    try {
      if (editingId) await doctorApi.update(editingId, payload)
      else await doctorApi.create(payload)
      setForm(EMPTY)
      setEditingId(null)
      reload()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const edit = (d) => {
    setEditingId(d.id)
    setForm({ name: d.name, specialization: d.specialization, experience: d.experience, phone: d.phone })
  }

  const remove = async (id) => {
    if (!confirm('Delete this doctor?')) return
    await doctorApi.remove(id)
    reload()
  }

  return (
    <div>
      <div className="card">
        <h2>{editingId ? 'Edit Doctor' : 'Add Doctor'}</h2>
        {formError && <div className="alert error">{formError}</div>}
        <form onSubmit={submit} className="form-row">
          <div className="field"><label>Name</label>
            <input name="name" value={form.name} onChange={onChange} required /></div>
          <div className="field"><label>Specialization</label>
            <input name="specialization" value={form.specialization} onChange={onChange} /></div>
          <div className="field"><label>Experience (yrs)</label>
            <input name="experience" type="number" value={form.experience} onChange={onChange} /></div>
          <div className="field"><label>Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} /></div>
          <button className="btn" type="submit">{editingId ? 'Update' : 'Add'}</button>
          {editingId && (
            <button type="button" className="btn secondary"
              onClick={() => { setEditingId(null); setForm(EMPTY) }}>Cancel</button>
          )}
        </form>
      </div>

      <div className="card">
        <h2>Doctors ({pageData.totalElements})</h2>
        {loading && <div className="spinner">Loading…</div>}
        {error && <div className="alert error">{error}</div>}
        {!loading && !error && (
          <>
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Specialization</th><th>Experience</th><th>Phone</th><th></th></tr></thead>
              <tbody>
                {pageData.content.map((d) => (
                  <tr key={d.id}>
                    <td>{d.id}</td><td>{d.name}</td><td>{d.specialization}</td>
                    <td>{d.experience}</td><td>{d.phone}</td>
                    <td>
                      <button className="link edit" onClick={() => edit(d)}>Edit</button>
                      <button className="link delete" onClick={() => remove(d.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {pageData.content.length === 0 && <tr><td colSpan="6" className="muted">No doctors found.</td></tr>}
              </tbody>
            </table>
            <Pagination pageData={pageData} setPage={setPage} sort={sort} changeSort={changeSort} sortOptions={SORT_OPTIONS} />
          </>
        )}
      </div>
    </div>
  )
}
