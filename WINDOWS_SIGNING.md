# Windows code signing (SmartScreen)

SmartScreen blocks unsigned installers. Fix: **sign the `.exe` with a trusted code-signing certificate**.

## 1. Get a certificate

Choose one:

| Provider | Type | Notes |
|----------|------|--------|
| [SSL.com](https://www.ssl.com/code-signing/) | OV Code Signing | Often cheapest |
| [Sectigo](https://www.sectigo.com/ssl-certificates-tls/code-signing) | OV / EV | EV = faster SmartScreen trust |
| [DigiCert](https://www.digcert.com/signing/code-signing-certificates) | OV / EV | Widely used |
| [Azure Trusted Signing](https://azure.microsoft.com/products/trusted-signing) | Cloud signing | No USB token; needs Azure setup |

You need **Code Signing** (not a normal SSL website cert). EV certificates reduce SmartScreen warnings sooner.

## 2. Export a `.pfx` (Windows)

1. Install the certificate on a **Windows** machine (token/USB if EV).
2. `certmgr.msc` → Personal → Certificates → your code signing cert.
3. Right-click → **All Tasks** → **Export** → **Yes, export the private key** → **PFX**.
4. Save as `desktop-app/build/code-sign.pfx` (this path is gitignored).

## 3. Build a signed installer

PowerShell:

```powershell
cd desktop-app
$env:WIN_CSC_KEY_PASSWORD = "your-pfx-export-password"
npm run build:win:signed
```

Or with an explicit path:

```powershell
$env:WIN_CSC_LINK = "C:\certs\yieldlyx-codesign.pfx"
$env:WIN_CSC_KEY_PASSWORD = "your-password"
npm run build:win:signed
```

Output: `dist/YieldlyX Setup 1.0.0.exe` (signed).

## 4. Verify signature

```powershell
Get-AuthenticodeSignature ".\dist\YieldlyX Setup 1.0.0.exe"
```

`Status` should be **Valid**. Publisher should show your company name.

## 5. SmartScreen reputation

Even with a valid signature, **brand-new** certificates may show a warning until:

- You use an **EV** certificate, or  
- Enough users download/run the signed app (reputation builds over weeks).

## Unsigned dev builds

```powershell
npm run build:win
```

Uses `signAndEditExecutable: false` for local testing without a certificate.
