import { billingApi, appointmentApi, patientApi, doctorApi, usePaged, useAll } from '../api.js'
import Pagination from './Pagination.jsx'

const STATUSES = ['PENDING', 'PAID', 'CANCELLED']
const SORT_OPTIONS = [
  { value: 'id,asc', label: 'ID (asc)' },
  { value: 'amount,desc', label: 'Amount (high→low)' },
  { value: 'amount,asc', label: 'Amount (low→high)' },
  { value: 'status,asc', label: 'Status' },
]

export default function Bills() {
  const { pageData, page, setPage, sort, changeSort, loading, error, reload } = usePaged(billingApi.list)
  // Pull related data so we can show patient & doctor names per bill.
  const { items: appointments } = useAll(appointmentApi.list)
  const { items: patients } = useAll(patientApi.list)
  const { items: doctors } = useAll(doctorApi.list)

  const namesForBill = (bill) => {
    const appt = appointments.find((a) => a.id === bill.appointmentId)
    if (!appt) return { patient: '—', doctor: '—' }
    const patient = patients.find((p) => p.id === appt.patientId)
    const doctor = doctors.find((d) => d.id === appt.doctorId)
    return {
      patient: patient ? patient.name : `#${appt.patientId}`,
      doctor: doctor ? doctor.name : `#${appt.doctorId}`,
    }
  }

  const changeStatus = async (id, status) => {
    await billingApi.updateStatus(id, status)
    reload()
  }

  const remove = async (id) => {
    if (!confirm('Delete this bill?')) return
    await billingApi.remove(id)
    reload()
  }

  return (
    <div>
      <div className="card">
        <h2>Bills ({pageData.totalElements})</h2>
        <p className="muted">
          Bills are generated automatically when an appointment is booked (via Kafka).
        </p>
        {loading && <div className="spinner">Loading…</div>}
        {error && <div className="alert error">{error}</div>}
        {!loading && !error && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Bill ID</th><th>Patient</th><th>Doctor</th><th>Appointment ID</th>
                  <th>Amount</th><th>Status</th><th>Update Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pageData.content.map((b) => {
                  const { patient, doctor } = namesForBill(b)
                  return (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{patient}</td>
                      <td>{doctor}</td>
                      <td>{b.appointmentId}</td>
                      <td>${Number(b.amount).toFixed(2)}</td>
                      <td><span className={`badge ${(b.status || '').toLowerCase()}`}>{b.status}</span></td>
                      <td>
                        <select value={b.status} onChange={(e) => changeStatus(b.id, e.target.value)}>
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td>
                        <button className="link delete" onClick={() => remove(b.id)}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
                {pageData.content.length === 0 && <tr><td colSpan="8" className="muted">No bills yet. Book an appointment to generate one.</td></tr>}
              </tbody>
            </table>
            <Pagination pageData={pageData} setPage={setPage} sort={sort} changeSort={changeSort} sortOptions={SORT_OPTIONS} />
          </>
        )}
      </div>
    </div>
  )
}
