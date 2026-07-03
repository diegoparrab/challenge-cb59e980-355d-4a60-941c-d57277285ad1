# Product Summary

Simulated mobile banking app built as a learning lab for biometric authentication on iOS and Android.

## Purpose

Teach developers how biometric hardware works (Face ID, Touch ID, Android fingerprint) by implementing a full authentication flow that exposes what happens at the hardware level — Secure Enclave, TEE, hardware-backed keys, challenge-response signing.

## Key Capabilities

- Detect device biometric hardware and enrollment status
- Biometric enrollment opt-in after initial credential login
- Challenge → signature → verification login flow (keys never leave hardware)
- Comprehensive error handling: cancellations, lockouts, system interruptions
- Session management with background grace periods and re-authentication
- Step-up authentication for sensitive operations (transfers)
- Anti-replay protections (challenge expiry, one-time-use nonces, rate limiting)
- Key invalidation when device biometrics change

## Context

This is a Pragma training challenge (junior-l3 level). The backend is simulated — but server-side security properties (challenge lifecycle, replay defense) are still implemented because they are the core learning objective.
