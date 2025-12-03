# Security Best Practices

This document outlines security practices for the MCP HTTP Server project.

## 🔐 Secrets Management

### Never Commit Secrets

**DO NOT commit:**
- API keys (Shopify, Stripe, etc.)
- Access tokens
- Secret keys
- Passwords
- Private keys or certificates
- Any `.env` files (except `.env.example`)

### Protected Files

The following files are automatically ignored by `.gitignore`:
- `.env` - Local environment variables
- `.env.local` - Local overrides
- `*.pem`, `*.key`, `*.crt` - Certificates and keys
- `secrets/` - Any secrets directory
- `credentials.json` - Credential files

### Environment Variables

All sensitive configuration should use environment variables:

```bash
# Local development - use .env file (not committed)
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...
STRIPE_SECRET_KEY=sk_test_...
```

### Production Deployment

For production deployments on Vercel, use secure secret management:

**Vercel:**
- Use Vercel Environment Variables in the dashboard
- Set variables for Production, Preview, and Development environments
- Never hardcode secrets in code or commit them to git

**Example:**
```bash
# ✅ GOOD - Set in Vercel dashboard
# Go to Settings → Environment Variables
# Add: SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN, STRIPE_SECRET_KEY

# ❌ BAD - Don't commit secrets
# Never commit .env files or hardcode secrets
```

## 🔍 Security Checklist

Before committing code, verify:

- [ ] No `.env` files are committed
- [ ] No API keys or tokens in code
- [ ] No hardcoded credentials
- [ ] `.gitignore` includes all sensitive file patterns
- [ ] Documentation uses placeholder values only
- [ ] No secrets in deployment scripts

## 🚨 If Secrets Are Exposed

If you accidentally commit secrets:

1. **Immediately rotate the exposed secrets:**
   - Generate new API keys
   - Revoke old keys
   - Update all systems using the keys

2. **Remove from git history (if recent):**
   ```bash
   # Remove file from history (use with caution)
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push (coordinate with team):**
   ```bash
   git push origin --force --all
   ```

4. **Consider using git-secrets or similar tools:**
   ```bash
   # Install git-secrets
   brew install git-secrets
   
   # Add patterns to prevent committing secrets
   git secrets --register-aws
   git secrets --add 'shpat_[a-zA-Z0-9]{32,}'
   git secrets --add 'sk_test_[a-zA-Z0-9]{32,}'
   git secrets --add 'sk_live_[a-zA-Z0-9]{32,}'
   ```

## 📋 Environment Variable Reference

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `SHOPIFY_STORE_URL` or `SHOPIFY_SHOP` | Shopify store domain/subdomain | `your-store.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API token | `shpat_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` or `sk_live_...` |
| `DEMO_MODE` | Enable demo mode (mock responses) | `false` |
| `MCP_SERVER_URL` | Public MCP server URL override | `https://your-deployment.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | Frontend URL | `https://your-frontend.vercel.app` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `SHOPIFY_API_VERSION` | Shopify API version | `2024-10` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `https://chat.openai.com,https://chatgpt.com` |

## 🛡️ Additional Security Measures

1. **Use HTTPS everywhere** - All endpoints should use HTTPS (Vercel provides this automatically)
2. **Validate input** - Use Zod schemas for all user input
3. **Rate limiting** - Consider adding rate limiting for production
4. **CORS** - Strict CORS configuration (already implemented)
5. **Security headers** - Proper headers configured (already implemented)
6. **Regular updates** - Keep dependencies updated
7. **Secret rotation** - Rotate API keys regularly
8. **Audit logs** - Monitor access logs for suspicious activity

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Stripe Security Guide](https://stripe.com/docs/security)
- [Shopify Security Best Practices](https://shopify.dev/docs/apps/best-practices/security)
