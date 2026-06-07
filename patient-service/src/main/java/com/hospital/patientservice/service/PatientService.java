package com.hospital.patientservice.service;

import com.hospital.patientservice.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface PatientService {

    Patient createPatient(Patient patient);

    Page<Patient> getAllPatients(Pageable pageable);

    Patient getPatientById(Long id);

    Patient updatePatient(Long id, Patient patient);

    void deletePatient(Long id);
    List<Patient> searchPatients(String name, Integer age, String department);
}