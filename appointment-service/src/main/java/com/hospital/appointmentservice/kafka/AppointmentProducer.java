package com.hospital.appointmentservice.kafka;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class AppointmentProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;

    public AppointmentProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendAppointmentEvent(String message) {
        kafkaTemplate.send("appointment-topic", message);

        System.out.println("EVENT SENT: " + message);
    }
}