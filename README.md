# EPSIQ Official Website

Official public website and DIRECT distribution channel for **EPSIQ Maroc**.

## Current public release

- Version: **2.0.1**
- Version code: **20001**
- Android: **7.0+**
- Scope: **Collège + Lycée**
- Levels: **1AC, 2AC, 3AC, TC, 1BAC, 2BAC**
- Distribution channel: **DIRECT**

Official APK:

`https://github.com/BAYAYEPS/EPSIQ-WEBSITE/releases/download/v2.0.1/EPSIQ-2.0.1.apk`

APK SHA-256:

`48f2b49aa8fb00a769bd445dc2a1ac566dc8c54d776e55e8f0047e3265a85fdd`

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

The manifest must only be updated after the corresponding APK has been published and verified.

## Deployment

Production website files are maintained in this repository.

Cloudflare deployment configuration is retained through:

- `_headers`
- `wrangler.jsonc`

Do not publish secrets, signing credentials, private keys, license codes, teacher data, or student data in this repository.
