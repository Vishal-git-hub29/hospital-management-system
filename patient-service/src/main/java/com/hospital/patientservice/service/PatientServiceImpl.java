package com.hospital.patientservice.service;

import com.hospital.patientservice.entity.Patient;
import com.hospital.patientservice.exception.PatientNotFoundException;
import com.hospital.patientservice.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

    private final PatientRepository repository;

    @Override
    public Patient createPatient(Patient patient) {
        return repository.save(patient);
    }

    @Override
    public Page<Patient> getAllPatients(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Override
    public Patient getPatientById(Long id) {
        return repository.findById(id)
                .orElseThrow(() ->
                        new PatientNotFoundException(
                                "Patient not found with ID: " + id
                        )
                );
    }

    @Override
    public Patient updatePatient(Long id, Patient patient) {

        Patient existing = getPatientById(id);

        existing.setName(patient.getName());
        existing.setAge(patient.getAge());
        existing.setGender(patient.getGender());
        existing.setDepartment(patient.getDepartment());
        existing.setPhone(patient.getPhone());

        return repository.save(existing);
    }

    @Override
    public void deletePatient(Long id) {
        repository.deleteById(id);
    }

    @Override
    public List<Patient> searchPatients(String name, Integer age, String department) {
        return repository.searchPatients(name, age, department);
    }
}