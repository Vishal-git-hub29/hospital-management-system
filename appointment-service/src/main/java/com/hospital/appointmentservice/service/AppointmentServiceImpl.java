package com.hospital.appointmentservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.appointmentservice.entity.Appointment;
import com.hospital.appointmentservice.exception.InvalidAppointmentException;
import com.hospital.appointmentservice.feign.DoctorFeignClient;
import com.hospital.appointmentservice.feign.PatientFeignClient;
import com.hospital.appointmentservice.kafka.AppointmentProducer;
import com.hospital.appointmentservice.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepository repository;
    private final AppointmentProducer producer;
    private final PatientFeignClient patientFeignClient;
    private final DoctorFeignClient doctorFeignClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Appointment bookAppointment(Appointment appointment) {

        // Validate that the referenced patient and doctor actually exist
        // by calling Patient Service and Doctor Service via Feign.
        validatePatient(appointment.getPatientId());
        validateDoctor(appointment.getDoctorId());

        appointment.setStatus("BOOKED");

        Appointment saved = repository.save(appointment);

        try {
            // convert ONLY saved object to JSON string
            String event = objectMapper.writeValueAsString(saved);

            producer.sendAppointmentEvent(event);

        } catch (Exception e) {
            System.out.println("Kafka Event Error: " + e.getMessage());
        }

        return saved;
    }

    @Override
    public Page<Appointment> getAllAppointments(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Override
    public Appointment getAppointmentById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Appointment not found with ID: " + id));
    }

    @Override
    public Appointment updateAppointment(Long id, Appointment appointment) {

        Appointment existing = getAppointmentById(id);

        existing.setPatientId(appointment.getPatientId());
        existing.setDoctorId(appointment.getDoctorId());
        existing.setAppointmentDate(appointment.getAppointmentDate());

        if (appointment.getStatus() != null) {
            existing.setStatus(appointment.getStatus());
        }

        return repository.save(existing);
    }

    @Override
    public void deleteAppointment(Long id) {
        repository.deleteById(id);
    }

    private void validatePatient(Long patientId) {
        if (patientId == null) {
            throw new InvalidAppointmentException("patientId is required");
        }
        try {
            patientFeignClient.getPatientById(patientId);
        } catch (Exception e) {
            throw new InvalidAppointmentException(
                    "Patient not found with ID: " + patientId);
        }
    }

    private void validateDoctor(Long doctorId) {
        if (doctorId == null) {
            throw new InvalidAppointmentException("doctorId is required");
        }
        try {
            doctorFeignClient.getDoctorById(doctorId);
        } catch (Exception e) {
            throw new InvalidAppointmentException(
                    "Doctor not found with ID: " + doctorId);
        }
    }
}