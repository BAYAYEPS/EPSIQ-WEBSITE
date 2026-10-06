# EPSIQ Official Website

Official public website and DIRECT distribution channel for **EPSIQ Maroc**.

## Current public release

- Version: **3.0.0**
- Version code: **30000**
- Android: **7.0+**
- Scope: **Collège + Lycée**
- Levels: **1AC, 2AC, 3AC, TC, 1BAC, 2BAC**
- Distribution channel: **DIRECT**

Official APK:

The first-party APK asset authority is <https://epsiq.ma/downloads/EPSIQ-3.0.0.apk>. Teachers can also use the official route: <https://epsiq.ma/#download>.

APK SHA-256:

`42af2d9dd781b57e6d576d3374a8e977dabf77d0dbdfd5cf2de571d4ddf3447d`

## Website

Production domain:

`https://epsiq.ma`

The website is bilingual:

- French
- Arabic

It includes:

- EPSIQ product presentation
- Collège + Lycée coverage
- Android download
- annual-access activation
- pedagogical resources
- privacy policy
- terms
- support
- DIRECT update discovery manifest

## Update manifest

The Android application checks:

`https://epsiq.ma/app-update.json`

The manifest must be updated **last**, after the corresponding APK has been published and verified.

## Deployment

Production website files are maintained in this repository.

Cloudflare deployment configuration is retained through:

- `_headers`
- `wrangler.jsonc`

Do not publish secrets, signing credentials, private keys, license codes, teacher data, or student data in this repository.
