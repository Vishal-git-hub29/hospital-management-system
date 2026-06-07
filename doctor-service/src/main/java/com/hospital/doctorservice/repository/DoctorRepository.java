package com.hospital.doctorservice.repository;

import com.hospital.doctorservice.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorRepository
        extends JpaRepository<Doctor, Long> {
}