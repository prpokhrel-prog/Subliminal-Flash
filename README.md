# Subliminal Flash Pro (PWA) — v3

A personal, client-only PWA to flash subliminal messages over YouTube/TikTok/Video surfaces.

## Deploy on GitHub Pages (free)
1. Create a new GitHub repository and clone it locally.
2. Copy these files into the repo and commit:
   ```bash
   git add .
   git commit -m "Add Subliminal Flash Pro v3"
   git push origin main
   ```
3. In the repo, go to **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` and **/ (root)**
4. Wait 1–2 minutes. Your site will be at `https://<username>.github.io/<repo>/`.
5. **Custom domain (optional):**
   - Edit the `CNAME` file to your domain (e.g., `app.example.com`).
   - In your DNS, create a CNAME record from `app.example.com` → `<username>.github.io`.
   - In GitHub Pages → **Custom domain**, set the same domain and enforce HTTPS.

## Use
- iPhone: open the site in Safari → Share → **Add to Home Screen**.
- Android: open in Chrome → **Install app**.
- Add categories/messages. Use **Flash From Categories** to select one/many and assign **weights**.
- Configure interval/duration, style, **auto-stop** (minutes or total flashes), markdown/bullets, position, mode (message or word).

## YouTube
- **Bookmarks**: save the current video. **Search** requires a YouTube Data API key (restrict by referrer).
- **Watch Later**: optional OAuth Client ID; keep app in Testing and add your Google account as a tester.

## Notes
- No backend; data is stored in your browser (localStorage).
- Overlays appear only inside this app surface; you can’t draw over other apps or browser tabs.
