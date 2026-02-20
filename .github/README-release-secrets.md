# Release Workflow Secrets

## Required for code-signing and notarization

Configure these repository secrets to enable signed, notarized DMG builds:

| Secret | Description |
|--------|-------------|
| `APPLE_DEV_ID_APP_CERT_BASE64` | Developer ID Application certificate (`.p12`) exported as base64 |
| `APPLE_DEV_ID_APP_CERT_PASSWORD` | Password for the `.p12` certificate |
| `APPLE_TEAM_ID` | Apple Developer Team ID (10 characters) |
| `APPLE_ID` | Apple ID email used for notarization |
| `APPLE_APP_PASSWORD` | App-specific password for Apple ID (not your main password) |

**All five must be set** for signing/notarization to run. If any is missing, the step is skipped.

## Unsigned fallback

- If one or more secrets are missing, the workflow **skips** the code-sign and notarize step.
- Build continues with an unsigned app bundle.
- DMG is still packaged and uploaded as an artifact (and to the release, if triggered by a release event).
- Users may see Gatekeeper warnings when opening unsigned builds.

## Exporting the certificate as base64

```bash
base64 -i YourCertificate.p12 | pbcopy
```

Paste the result into the `APPLE_DEV_ID_APP_CERT_BASE64` secret.
