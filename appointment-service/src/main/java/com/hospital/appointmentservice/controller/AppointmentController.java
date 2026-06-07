package com.hospital.appointmentservice.controller;

import com.hospital.appointmentservice.entity.Appointment;
import com.hospital.appointmentservice.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService service;

    @PostMapping
    public Appointment book(@RequestBody Appointment appointment) {
        return service.bookAppointment(appointment);
    }

    // Paginated + sortable: e.g. /appointments?page=0&size=5&sort=appointmentDate,desc
    @GetMapping
    public Page<Appointment> getAll(@PageableDefault(size = 5, sort = "id") Pageable pageable) {
        return service.getAllAppointments(pageable);
    }

    @GetMapping("/{id}")
    public Appointment getById(@PathVariable Long id) {
        return service.getAppointmentById(id);
    }

    @PutMapping("/{id}")
    public Appointment update(@PathVariable Long id,
                             @RequestBody Appointment appointment) {
        return service.updateAppointment(id, appointment);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.deleteAppointment(id);
    }
}