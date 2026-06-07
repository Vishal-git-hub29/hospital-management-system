package com.hospital.doctorservice.service;

import com.hospital.doctorservice.dto.DoctorPatientResponse;
import com.hospital.doctorservice.entity.Doctor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DoctorService {

    Doctor createDoctor(Doctor doctor);

    Page<Doctor> getAllDoctors(Pageable pageable);

    Doctor getDoctorById(Long id);

    Doctor updateDoctor(Long id, Doctor doctor);

    DoctorPatientResponse getDoctorWithPatient(
            Long doctorId,
            Long patientId
    );

    void deleteDoctor(Long id);
}