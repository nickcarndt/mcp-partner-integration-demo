# Google Cloud Deployment Commands

## Prerequisites

1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Ensure you have billing enabled on project `mcp-commerce-demo`

## Step 1: Authenticate and Set Project

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set the project
gcloud config set project mcp-commerce-demo

# Verify project is set
gcloud config get-value project
```

## Step 2: Enable Required APIs

```bash
# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Enable Artifact Registry API
gcloud services enable artifactregistry.googleapis.com

# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Secret Manager API (for storing API keys)
gcloud services enable secretmanager.googleapis.com

# Verify all APIs are enabled
gcloud services list --enabled
```

## Step 3: Create Artifact Registry Repository

```bash
# Create Artifact Registry repository for Docker images
gcloud artifacts repositories create mcp-containers \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for MCP HTTP Server"

# Verify repository was created
gcloud artifacts repositories list --location=us-central1
```

## Step 4: Configure Docker Authentication

```bash
# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

## Step 5: Create Secrets in Secret Manager

```bash
# Create Shopify store URL secret
echo -n "mcp-commerce-demo.myshopify.com" | \
  gcloud secrets create shopify-store-url \
  --data-file=-

# Create Shopify access token secret
echo -n "YOUR_SHOPIFY_ACCESS_TOKEN" | \
  gcloud secrets create shopify-access-token \
  --data-file=-

# Create Stripe secret key secret
echo -n "YOUR_STRIPE_SECRET_KEY" | \
  gcloud secrets create stripe-secret-key \
  --data-file=-

# Grant Cloud Run service account access to secrets
PROJECT_NUMBER=$(gcloud projects describe mcp-commerce-demo --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding shopify-store-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding shopify-access-token \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding stripe-secret-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 6: Grant Cloud Build Permissions

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe mcp-commerce-demo --format="value(projectNumber)")

# Grant Cloud Build service account permission to push to Artifact Registry
gcloud projects add-iam-policy-binding mcp-commerce-demo \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant Cloud Build service account permission to deploy to Cloud Run
gcloud projects add-iam-policy-binding mcp-commerce-demo \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Cloud Build service account permission to act as Cloud Run service
gcloud projects add-iam-policy-binding mcp-commerce-demo \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## Step 7: Run Cloud Build

```bash
# Submit the build to Cloud Build
gcloud builds submit --config=cloudbuild.yaml .

# Monitor the build
gcloud builds list --limit=1
```

## Step 8: Verify Deployment

```bash
# Get the Cloud Run service URL
gcloud run services describe mcp-http-server \
  --region=us-central1 \
  --format='value(status.url)'

# Test the health endpoint
curl https://$(gcloud run services describe mcp-http-server --region=us-central1 --format='value(status.url)' | sed 's|https://||')/healthz

# Test the MCP manifest
curl https://$(gcloud run services describe mcp-http-server --region=us-central1 --format='value(status.url)' | sed 's|https://||')/mcp-manifest.json
```

## Step 9: Update Environment Variables (After Vercel Deployment)

Once you've deployed the Next.js frontend to Vercel, update Cloud Run with the frontend URL:

```bash
# Update with your Vercel URL
gcloud run services update mcp-http-server \
  --region=us-central1 \
  --update-env-vars="NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app"
```

## Quick Reference: All Commands in Sequence

```bash
# 1. Authenticate and set project
gcloud auth login
gcloud config set project mcp-commerce-demo

# 2. Enable APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

# 3. Create Artifact Registry repository
gcloud artifacts repositories create mcp-containers \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for MCP HTTP Server"

# 4. Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev

# 5. Create secrets (replace with your actual values)
echo -n "mcp-commerce-demo.myshopify.com" | gcloud secrets create shopify-store-url --data-file=-
echo -n "YOUR_SHOPIFY_TOKEN" | gcloud secrets create shopify-access-token --data-file=-
echo -n "YOUR_STRIPE_KEY" | gcloud secrets create stripe-secret-key --data-file=-

# 6. Grant permissions
PROJECT_NUMBER=$(gcloud projects describe mcp-commerce-demo --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding shopify-store-url --member="serviceAccount:${SERVICE_ACCOUNT}" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding shopify-access-token --member="serviceAccount:${SERVICE_ACCOUNT}" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding stripe-secret-key --member="serviceAccount:${SERVICE_ACCOUNT}" --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding mcp-commerce-demo --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding mcp-commerce-demo --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" --role="roles/run.admin"
gcloud projects add-iam-policy-binding mcp-commerce-demo --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" --role="roles/iam.serviceAccountUser"

# 7. Run Cloud Build
gcloud builds submit --config=cloudbuild.yaml .

# 8. Get service URL
gcloud run services describe mcp-http-server --region=us-central1 --format='value(status.url)'
```

## Cloud Run Service Details

- **Service Name**: `mcp-http-server`
- **Region**: `us-central1`
- **Port**: `8080`
- **Memory**: `512Mi`
- **CPU**: `1`
- **Min Instances**: `0` (scales to zero)
- **Max Instances**: `10`
- **Authentication**: Public (unauthenticated access)
- **HTTPS**: Automatically provided by Cloud Run

## Public HTTPS Endpoint

✅ **Confirmed**: The Cloud Run service will automatically provide a public HTTPS endpoint in the format:
```
https://mcp-http-server-XXXXX-uc.a.run.app
```

This endpoint is:
- ✅ Publicly accessible (due to `--allow-unauthenticated`)
- ✅ HTTPS-enabled (automatic with Cloud Run)
- ✅ Accessible by ChatGPT MCP
- ✅ CORS-configured for ChatGPT origins

The MCP manifest will be available at:
```
https://mcp-http-server-XXXXX-uc.a.run.app/mcp-manifest.json
```

