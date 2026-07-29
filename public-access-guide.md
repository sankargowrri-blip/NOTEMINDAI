# NoteMind AI — Public Access & Deployment Guide

This guide explains how your project's public static assets are configured and how to generate a live **public URL link** for your NoteMind AI application.

---

## 1. Public Static Directory (`frontend/public/`)

The following public assets have been created in `frontend/public/`:

| File | Path | Description |
|------|------|-------------|
| **Favicon** | `frontend/public/favicon.ico` | Browser tab icon |
| **Brand Logo** | `frontend/public/logo.svg` | Vector brand logo with gradients |
| **Brand Icon** | `frontend/public/logo-icon.svg` | Compact square icon for PWA/headers |
| **Web Manifest** | `frontend/public/manifest.json` | Progressive Web App configuration |
| **Robots Directives** | `frontend/public/robots.txt` | Search engine indexing rules |
| **OpenGraph Banner** | `frontend/public/og-image.svg` | Social share preview graphic (1200x630) |
| **Sample Upload** | `frontend/public/samples/sample-note.svg` | Demo handwritten note asset |

---

## 2. Generating a Live Public Link (Instant Tunneling)

You can share your local NoteMind AI app publicly on the internet using `localtunnel` or `cloudflared`.

### Option A: Using `localtunnel` (Included)

Run the following command from your terminal:

```bash
# Public URL for Frontend (Port 3000)
npx localtunnel --port 3000 --subdomain notemind-ai
```

Or run `start-public.bat` from the root directory.

### Option B: Cloudflare Tunnel

```bash
npx @cloudflare/cloudflared tunnel --url http://localhost:3000
```

---

## 3. Production Cloud Hosting (Permanent Public Links)

For permanent 24/7 public URLs without relying on your local computer running:

### Deployment on Vercel (Frontend)
1. Push project to GitHub.
2. Connect repository to [Vercel](https://vercel.com).
3. Set Root Directory to `frontend`.
4. Set Environment Variable: `NEXT_PUBLIC_API_URL` to your live backend domain.

### Deployment on Render (Full Stack)
The project includes a pre-configured [`render.yaml`](file:///c:/Users/sanka/OneDrive/Documents/NOTEMINDAI/render.yaml) file for one-click deployment on Render.com:
1. Push project to GitHub.
2. Connect repo on Render -> New Blueprint Instance.
