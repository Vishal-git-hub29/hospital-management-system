package com.hospital.appointmentservice.repository;

import com.hospital.appointmentservice.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
}