import { useState } from 'react'
import { patientApi, usePaged } from '../api.js'
import Pagination from './Pagination.jsx'

const EMPTY = { name: '', age: '', gender: '', department: '', phone: '' }
const SORT_OPTIONS = [
  { value: 'id,asc', label: 'ID (asc)' },
  { value: 'name,asc', label: 'Name (A–Z)' },
  { value: 'name,desc', label: 'Name (Z–A)' },
  { value: 'age,asc', label: 'Age (asc)' },
  { value: 'age,desc', label: 'Age (desc)' },
  { value: 'department,asc', label: 'Department' },
]

export default function Patients() {
  const { pageData, page, setPage, sort, changeSort, loading, error, reload } = usePaged(patientApi.list)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState({ name: '', age: '', department: '' })
  const [searchResults, setSearchResults] = useState(null) // null = show paged list
  const [formError, setFormError] = useState(null)

  const rows = searchResults !== null ? searchResults : pageData.content

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setFormError(null)
    const payload = { ...form, age: form.age ? Number(form.age) : null }
    try {
      if (editingId) await patientApi.update(editingId, payload)
      else await patientApi.create(payload)
      setForm(EMPTY)
      setEditingId(null)
      setSearchResults(null)
      reload()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const edit = (p) => {
    setEditingId(p.id)
    setForm({ name: p.name, age: p.age, gender: p.gender, department: p.department, phone: p.phone })
  }

  const remove = async (id) => {
    if (!confirm('Delete this patient?')) return
    await patientApi.remove(id)
    if (searchResults !== null) setSearchResults(searchResults.filter((p) => p.id !== id))
    else reload()
  }

  const runSearch = async (e) => {
    e.preventDefault()
    const results = await patientApi.search(search)
    setSearchResults(results)
  }

  const resetSearch = () => {
    setSearch({ name: '', age: '', department: '' })
    setSearchResults(null)
    reload()
  }

  return (
    <div>
      <div className="card">
        <h2>{editingId ? 'Edit Patient' : 'Add Patient'}</h2>
        {formError && <div className="alert error">{formError}</div>}
        <form onSubmit={submit} className="form-row">
          <div className="field"><label>Name</label>
            <input name="name" value={form.name} onChange={onChange} required /></div>
          <div className="field"><label>Age</label>
            <input name="age" type="number" value={form.age} onChange={onChange} /></div>
          <div className="field"><label>Gender</label>
            <select name="gender" value={form.gender} onChange={onChange}>
              <option value="">—</option><option>M</option><option>F</option><option>Other</option>
            </select></div>
          <div className="field"><label>Department</label>
            <input name="department" value={form.department} onChange={onChange} /></div>
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
        <h2>Search (complex multi-criteria query)</h2>
        <form onSubmit={runSearch} className="form-row">
          <div className="field"><label>Name</label>
            <input value={search.name} onChange={(e) => setSearch({ ...search, name: e.target.value })} /></div>
          <div className="field"><label>Age</label>
            <input type="number" value={search.age} onChange={(e) => setSearch({ ...search, age: e.target.value })} /></div>
          <div className="field"><label>Department</label>
            <input value={search.department} onChange={(e) => setSearch({ ...search, department: e.target.value })} /></div>
          <button className="btn" type="submit">Search</button>
          <button type="button" className="btn secondary" onClick={resetSearch}>Reset</button>
        </form>
      </div>

      <div className="card">
        <h2>
          Patients{searchResults !== null ? ` — search results (${rows.length})` : ` (${pageData.totalElements})`}
        </h2>
        {loading && <div className="spinner">Loading…</div>}
        {error && <div className="alert error">{error}</div>}
        {!loading && !error && (
          <>
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Department</th><th>Phone</th><th></th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td><td>{p.name}</td><td>{p.age}</td><td>{p.gender}</td>
                    <td>{p.department}</td><td>{p.phone}</td>
                    <td>
                      <button className="link edit" onClick={() => edit(p)}>Edit</button>
                      <button className="link delete" onClick={() => remove(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan="7" className="muted">No patients found.</td></tr>}
              </tbody>
            </table>
            {searchResults === null && (
              <Pagination pageData={pageData} setPage={setPage} sort={sort} changeSort={changeSort} sortOptions={SORT_OPTIONS} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
