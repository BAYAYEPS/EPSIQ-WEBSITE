# EPSIQ Official Website

Official public website and DIRECT distribution channel for **EPSIQ Maroc**.

## Current public release

- Version: **2.0.2**
- Version code: **20002**
- Android: **7.0+**
- Scope: **Collège + Lycée**
- Levels: **1AC, 2AC, 3AC, TC, 1BAC, 2BAC**
- Distribution channel: **DIRECT**

Official APK:

GitHub Releases is the actual APK asset authority. Teachers use the official route: <https://epsiq.ma/#download>.

APK SHA-256:

`e4fec62b4d513e58c6ea518a0fa7741bcfcee086eb528b2f67f7b12884393fb0`

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
