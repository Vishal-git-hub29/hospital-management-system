package com.hospital.patientservice.controller;

import com.hospital.patientservice.entity.Patient;
import com.hospital.patientservice.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService service;

    @PostMapping
    public Patient create(@RequestBody Patient patient) {
        return service.createPatient(patient);
    }

    // Paginated + sortable: e.g. /patients?page=0&size=5&sort=name,asc
    @GetMapping
    public Page<Patient> getAll(@PageableDefault(size = 5, sort = "id") Pageable pageable) {
        return service.getAllPatients(pageable);
    }

    @GetMapping("/{id}")
    public Patient getById(@PathVariable Long id) {
        return service.getPatientById(id);
    }

    @PutMapping("/{id}")
    public Patient update(@PathVariable Long id,
                          @RequestBody Patient patient) {
        return service.updatePatient(id, patient);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.deletePatient(id);
    }

    @GetMapping("/search")
    public List<Patient> searchPatients(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Integer age,
            @RequestParam(required = false) String department
    ) {
        return service.searchPatients(name, age, department);
    }
}