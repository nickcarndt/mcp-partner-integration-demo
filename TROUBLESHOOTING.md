# Troubleshooting Guide

## Buttons Not Working on Localhost

99% of the time it's one of these. Run through them top→down:

### 1. You Opened the File, Not the Server

**Symptom:** URL shows `file:///…/demo.html` instead of `https://localhost:8443`

**Fix:** 
- Run `npm run dev` 
- Open `https://localhost:8443` (served by Express; trust the local certificate when prompted)

### 2. Server Not Running / Wrong Port

**Symptom:** Terminal doesn't show "MCP HTTP Server running" message

**Fix:**
- Check terminal for errors
- Verify the HTTP redirect listener is on port 8080 and the HTTPS listener is on port 8443 (or your configured ports)
- If you changed ports, visit the exact origin your server uses

### 3. Static Route Isn't Mounted

**Check:** In `src/server.ts`, ensure:
```typescript
app.use(express.static(path.join(process.cwd(), 'src', 'public')));
app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'public', 'demo.html'));
});
```

**Fix:** Restart the server after edits (`npm run dev`)

### 4. JSON Body Parser Missing

**Check:** In `src/server.ts`, ensure:
```typescript
app.use(express.json({ limit: '10mb' }));
```
This should be **before** your `/tools/:toolName` route.

### 5. Tool Name Mismatch

**Check:** Tool names must match exactly in both UI and server:

- UI: `fetch('/tools/ping')` → Server: `case 'ping':`
- UI: `fetch('/tools/shopify.searchProducts')` → Server: `case 'shopify.searchProducts':`
- UI: `fetch('/tools/stripe.createCheckoutSession')` → Server: `case 'stripe.createCheckoutSession':`

**Fix:** Ensure exact match (case-sensitive)

### 6. DEMO_MODE Off (Mock Paths Disabled)

**Symptom:** Tools return errors about "Real API not implemented"

**Check:** `.env` file contains:
```
DEMO_MODE=true
```

**Fix:** 
1. Create `.env` from `.env.example` if missing
2. Set `DEMO_MODE=true`
3. **Restart the server** (dotenv loads at boot)

### 7. CORS / Different Origin

**Symptom:** Browser console shows CORS errors

**Fix 1:** Use the MCP's own UI at `https://localhost:8443` (same origin)

**Fix 2 (if cross-origin on purpose):** 
- In `.env`: `ALLOWED_ORIGINS=https://localhost:8443`
- Server already configured to allow same-origin requests

### 8. Demo Textarea Parses Invalid JSON

**Symptom:** Stripe button does nothing, no error shown

**Fix:** The demo UI now includes safe JSON parsing with error messages. If you see a JSON parse error, check:
- No trailing commas in JSON arrays
- Proper quotes around strings
- Valid JSON syntax

### 9. Missing Headers on Server Response

**Check:** All responses should return JSON:
```typescript
res.json({ ... });  // ✅ Correct
res.send({ ... });  // ❌ Might not set Content-Type
```

**Fix:** Ensure every code path uses `res.json()`, even on errors

### 10. Check the Browser Network Tab

**How to debug:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click a button
4. Look for the request:
   - **404** → Tool name mismatch
   - **500** → Server error (check DEMO_MODE, check server logs)
   - **0 or blocked** → Wrong origin or server down
   - **CORS error** → Origin not allowed

### Quick Isolate with curl

Test server independently of UI:

```bash
# Health check
curl -sk https://localhost:8443/healthz | jq

# Ping tool
curl -sk -X POST https://localhost:8443/tools/ping \
  -H 'Content-Type: application/json' \
  -d '{"params":{"name":"Nick"}}' | jq

# Shopify (requires DEMO_MODE=true)
curl -sk -X POST https://localhost:8443/tools/shopify.searchProducts \
  -H 'Content-Type: application/json' \
  -d '{"params":{"query":"laptop","limit":5}}' | jq
```

If curl works but UI doesn't → problem is in the browser (CORS, origin, or JavaScript)

## Common Error Messages

### "DEMO_MODE not set"
- **Fix:** Set `DEMO_MODE=true` in `.env` and restart server

### "Tool not found: X"
- **Fix:** Check tool name matches exactly (case-sensitive)

### "Invalid JSON response"
- **Fix:** Check server is returning JSON (not HTML error page)

### "Failed to fetch"
- **Fix:** Server not running, wrong port, or CORS blocking

## Safari Quick Checklist

If you're using Safari and seeing certificate warnings or connection issues:

1. **Trust the local certificate:**
   - Run `./setup.sh` to generate `cert/localhost.pem`
   - Double-click `cert/localhost.pem` to open in Keychain Access
   - Set it to **Always Trust** for SSL
   - Restart Safari

2. **Use HTTPS directly:**
   - Open `https://localhost:8443` (not `http://localhost:8080`)
   - The HTTP port redirects to HTTPS when certificates are present

3. **If certificate warning persists:**
   - Remove old files in `cert/` and rerun `./setup.sh`
   - Re-trust the new certificate

4. **Disable HTTPS if needed:**
   - Start with `ENABLE_HTTPS=false npm run dev`
   - Note: Safari may still upgrade HTTP to HTTPS automatically

With HTTPS in place, Safari works without JavaScript workarounds.

## Still Not Working?

1. **Check browser console** (F12) for JavaScript errors
2. **Check server logs** in terminal for server-side errors
3. **Verify server is running:** `curl -sk https://localhost:8443/healthz`
4. **Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
5. **Clear browser cache** if you've made HTML changes
