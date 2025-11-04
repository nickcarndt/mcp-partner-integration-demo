# Browser Compatibility & Hardening

## Problem: Safari HTTPS Upgrade

Safari automatically tries to upgrade `http://localhost` to `https://localhost`, causing SSL errors because our server only runs on HTTP. Chrome doesn't have this behavior.

## Solution: Multi-Layer HTTP Enforcement

We've implemented **5 layers of defense** to ensure HTTP is always used for localhost, regardless of browser:

### Layer 1: Early Page Redirect
```javascript
// If page loads via HTTPS, immediately redirect to HTTP
if (isLocalhost && currentProtocol === 'https:') {
  window.location.replace(httpUrl);
}
```
**Catches:** Safari loading the page via HTTPS

### Layer 2: Base URL Enforcement
```javascript
// Always use http:// for localhost, ignoring window.location.protocol
if (host.includes('localhost')) {
  return `http://${host}`; // Force HTTP
}
```
**Catches:** Safari reading `window.location.protocol` as `https:`

### Layer 3: URL Sanitization
```javascript
const ensureHttpUrl = (url) => {
  return url.replace(/^https:\/\//, 'http://'); // Force HTTP
};
```
**Catches:** Any HTTPS URLs that slip through

### Layer 4: Fetch Wrapper
```javascript
const safeFetch = (url, options) => {
  const httpUrl = ensureHttpUrl(url); // Sanitize before fetch
  return fetch(httpUrl, options);
};
```
**Catches:** Safari upgrading URLs during fetch construction

### Layer 5: Server-Side CORS
```typescript
// Server accepts HTTPS origins from Safari (even though we respond with HTTP)
const localhostVariants = [
  'http://localhost:8080',
  'https://localhost:8080', // Safari sometimes sends HTTPS
  // ...
];
```
**Catches:** Safari sending HTTPS origin headers

## Testing

### Chrome
- ✅ Works out of the box
- ✅ No special handling needed

### Safari
- ✅ Works with all 5 layers active
- ✅ Hard refresh (Cmd+Shift+R) may be needed after first load
- ✅ Clear cache if issues persist: Safari → Preferences → Privacy → Remove All Website Data

### Firefox
- ✅ Should work (similar to Chrome)

### Edge
- ✅ Should work (Chromium-based)

## Debugging

If buttons still don't work in Safari:

1. **Check Console Logs:**
   ```
   [Base URL] Final BASE_URL: http://localhost:8080
   [Fetch] Request: http://localhost:8080/healthz
   ```
   If you see `https://` in these logs, Layer 2 failed.

2. **Check Network Tab:**
   - Open Safari Web Inspector → Network
   - Click a button
   - Verify request URL is `http://localhost:8080/...` (not `https://`)

3. **Check Page URL:**
   - Address bar should show `http://localhost:8080`
   - If it shows `https://`, Layer 1 should redirect you

4. **Check CORS Headers:**
   - Network tab → Select request → Response Headers
   - Should see `Access-Control-Allow-Origin: http://localhost:8080`

## Why This Works

By implementing **defense in depth**, we catch Safari's HTTPS upgrade at every possible point:

1. **Page load** → Layer 1 redirects
2. **URL construction** → Layer 2 enforces HTTP
3. **URL manipulation** → Layer 3 sanitizes
4. **Fetch call** → Layer 4 wraps fetch
5. **Network request** → Layer 5 handles CORS

Even if Safari upgrades at one layer, the others catch it.

## Browser-Specific Behaviors

| Browser | HTTPS Upgrade | CORS Strictness | CSP Strictness | Our Solution |
|---------|---------------|-----------------|----------------|--------------|
| Chrome  | ❌ No         | ✅ Lenient      | ✅ Lenient      | Works out of box |
| Safari  | ✅ Yes        | ⚠️ Strict      | ⚠️ Strict      | 5 layers of defense |
| Firefox | ❌ No         | ✅ Lenient      | ✅ Lenient      | Works out of box |
| Edge    | ❌ No         | ✅ Lenient      | ✅ Lenient      | Works out of box |

## Maintenance

If you add new fetch calls:
1. **Always use `safeFetch()` instead of `fetch()`**
2. **Always use `${BASE_URL}/...` instead of relative URLs**
3. **Test in Safari** before deploying

Example:
```javascript
// ❌ BAD - Safari might upgrade this
const res = await fetch('/healthz');

// ✅ GOOD - Safari-proof
const res = await safeFetch(`${BASE_URL}/healthz`);
```

