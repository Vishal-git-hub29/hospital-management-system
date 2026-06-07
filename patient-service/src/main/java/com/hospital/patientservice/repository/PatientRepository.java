package com.hospital.patientservice.repository;

import com.hospital.patientservice.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    @Query("SELECT p FROM Patient p WHERE " +
            "(:name IS NULL OR p.name = :name) AND " +
            "(:age IS NULL OR p.age = :age) AND " +
            "(:department IS NULL OR p.department = :department)")
    List<Patient> searchPatients(
            @Param("name") String name,
            @Param("age") Integer age,
            @Param("department") String department
    );
}