## 2024-05-12 - [Critical] Removed hardcoded NVIDIA API Key
**Vulnerability:** A hardcoded API key for NVIDIA (`NVAPI_KEY`) was found in `scripts/qa-diagnostics.mjs`.
**Learning:** Hardcoded secrets in scripts or code are a major security risk as they can be easily leaked and abused. Even test scripts can be included in commits or published by mistake.
**Prevention:** Always use environment variables for sensitive keys and tokens. The code should fetch the key using `process.env` or similar mechanisms.

## 2026-05-18 - [Critical] Replaced hardcoded authorization secrets with environment variables
**Vulnerability:** Hardcoded string secrets (`lettr_cleanup_999`, `lettr_qa_phase4`) were used as a form of authorization for internal CRON endpoints.
**Learning:** Relying on hardcoded secrets to protect sensitive endpoints is a critical security vulnerability. If the code is ever leaked or pushed to a public repository, the endpoints can be triggered by attackers, potentially allowing them to run unauthorized maintenance actions or access protected data.
**Prevention:** Secure internal cron endpoints using securely generated, long-form secrets that are only known by the environment (e.g. `process.env.CRON_SECRET`) and verified via side-channel resistant comparisons when applicable.
