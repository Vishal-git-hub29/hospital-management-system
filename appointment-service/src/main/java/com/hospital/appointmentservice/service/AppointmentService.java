package com.hospital.appointmentservice.service;

import com.hospital.appointmentservice.entity.Appointment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AppointmentService {

    Appointment bookAppointment(Appointment appointment);

    Page<Appointment> getAllAppointments(Pageable pageable);

    Appointment getAppointmentById(Long id);

    Appointment updateAppointment(Long id, Appointment appointment);

    void deleteAppointment(Long id);
}