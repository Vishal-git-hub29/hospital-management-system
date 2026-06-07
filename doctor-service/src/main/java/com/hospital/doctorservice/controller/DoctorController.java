package com.hospital.doctorservice.controller;

import com.hospital.doctorservice.dto.DoctorPatientResponse;
import com.hospital.doctorservice.entity.Doctor;
import com.hospital.doctorservice.service.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService service;

    @PostMapping
    public Doctor create(@RequestBody Doctor doctor) {
        return service.createDoctor(doctor);
    }

    // Paginated + sortable: e.g. /doctors?page=0&size=5&sort=name,asc
    @GetMapping
    public Page<Doctor> getAll(@PageableDefault(size = 5, sort = "id") Pageable pageable) {
        return service.getAllDoctors(pageable);
    }

    @GetMapping("/{id}")
    public Doctor getById(@PathVariable Long id) {
        return service.getDoctorById(id);
    }

    @PutMapping("/{id}")
    public Doctor update(@PathVariable Long id,
                         @RequestBody Doctor doctor) {
        return service.updateDoctor(id, doctor);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.deleteDoctor(id);
    }

    // IMPORTANT ENDPOINT
    @GetMapping("/{doctorId}/patient/{patientId}")
    public DoctorPatientResponse getDoctorWithPatient(
            @PathVariable Long doctorId,
            @PathVariable Long patientId
    ) {
        return service.getDoctorWithPatient(doctorId, patientId);
    }
}