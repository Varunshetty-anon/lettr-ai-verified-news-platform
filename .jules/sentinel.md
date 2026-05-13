## 2024-05-12 - [Critical] Removed hardcoded NVIDIA API Key
**Vulnerability:** A hardcoded API key for NVIDIA (`NVAPI_KEY`) was found in `scripts/qa-diagnostics.mjs`.
**Learning:** Hardcoded secrets in scripts or code are a major security risk as they can be easily leaked and abused. Even test scripts can be included in commits or published by mistake.
**Prevention:** Always use environment variables for sensitive keys and tokens. The code should fetch the key using `process.env` or similar mechanisms.
