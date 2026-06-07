package com.hospital.doctorservice.service;

import com.hospital.doctorservice.dto.DoctorPatientResponse;
import com.hospital.doctorservice.entity.Doctor;
import com.hospital.doctorservice.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.hospital.doctorservice.exception.DoctorNotFoundException;
import com.hospital.doctorservice.dto.DoctorPatientResponse;
import com.hospital.doctorservice.dto.PatientDto;
import com.hospital.doctorservice.feign.PatientFeignClient;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorServiceImpl implements DoctorService {

    private final DoctorRepository repository;
    private final PatientFeignClient patientFeignClient;

    @Override
    public Doctor createDoctor(Doctor doctor) {
        return repository.save(doctor);
    }

    @Override
    public Page<Doctor> getAllDoctors(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Override
    public Doctor getDoctorById(Long id) {
        return repository.findById(id)
                .orElseThrow(() ->
                        new DoctorNotFoundException(
                                "Doctor not found with ID: " + id
                        )
                );
    }

    @Override
    public Doctor updateDoctor(Long id, Doctor doctor) {

        Doctor existing = getDoctorById(id);

        existing.setName(doctor.getName());
        existing.setSpecialization(doctor.getSpecialization());
        existing.setExperience(doctor.getExperience());
        existing.setPhone(doctor.getPhone());

        return repository.save(existing);
    }

    @Override
    @CircuitBreaker(
            name = "patientService",
            fallbackMethod = "patientServiceFallback"
    )
    public DoctorPatientResponse getDoctorWithPatient(
            Long doctorId,
            Long patientId
    ) {

        Doctor doctor = getDoctorById(doctorId);

        PatientDto patient =
                patientFeignClient.getPatientById(patientId);

        return DoctorPatientResponse.builder()
                .doctor(doctor)
                .patient(patient)
                .build();
    }

    public DoctorPatientResponse patientServiceFallback(
            Long doctorId,
            Long patientId,
            Exception ex
    ) {

        Doctor doctor = getDoctorById(doctorId);

        PatientDto fallbackPatient = PatientDto.builder()
                .id(patientId)
                .name("Patient Service Unavailable")
                .age(0)
                .gender("N/A")
                .department("N/A")
                .phone("N/A")
                .build();

        return DoctorPatientResponse.builder()
                .doctor(doctor)
                .patient(fallbackPatient)
                .build();
    }

    @Override
    public void deleteDoctor(Long id) {
        repository.deleteById(id);
    }
}