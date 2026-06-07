package com.hospital.billingservice.controller;

import com.hospital.billingservice.entity.Billing;
import com.hospital.billingservice.repository.BillingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bills")
@RequiredArgsConstructor
public class BillingController {

    private final BillingRepository billingRepository;

    // Paginated + sortable: e.g. /bills?page=0&size=5&sort=amount,desc
    @GetMapping
    public Page<Billing> getAllBills(@PageableDefault(size = 5, sort = "id") Pageable pageable) {
        return billingRepository.findAll(pageable);
    }

    @GetMapping("/{id}")
    public Billing getBillById(@PathVariable Long id) {
        return billingRepository.findById(id).orElse(null);
    }

    @PutMapping("/{id}/status")
    public Billing updateStatus(@PathVariable Long id,
                                @RequestParam String status) {
        Billing bill = billingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Bill not found with ID: " + id));
        bill.setStatus(status);
        return billingRepository.save(bill);
    }

    @DeleteMapping("/{id}")
    public void deleteBill(@PathVariable Long id) {
        billingRepository.deleteById(id);
    }
}