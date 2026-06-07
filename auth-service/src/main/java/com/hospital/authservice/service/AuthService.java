package com.hospital.authservice.service;

import com.hospital.authservice.dto.AuthResponse;
import com.hospital.authservice.dto.LoginRequest;
import com.hospital.authservice.dto.RegisterRequest;
import com.hospital.authservice.entity.User;
import com.hospital.authservice.exception.AuthException;
import com.hospital.authservice.repository.UserRepository;
import com.hospital.authservice.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (repository.existsByEmail(request.getEmail())) {
            throw new AuthException("An account with this email already exists");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        repository.save(user);

        return buildResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = repository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AuthException("Invalid email or password");
        }

        return buildResponse(user);
    }

    private AuthResponse buildResponse(User user) {
        return AuthResponse.builder()
                .token(jwtUtil.generateToken(user.getEmail()))
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build();
    }
}
