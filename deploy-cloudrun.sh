#!/bin/bash
# Deploy MCP HTTP Server to Google Cloud Run
# Usage: ./deploy-cloudrun.sh [PROJECT_ID] [REGION] [SERVICE_NAME]

set -e

PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT}}
REGION=${2:-us-central1}
SERVICE_NAME=${3:-mcp-http-server}
NEXT_PUBLIC_SITE_URL=${4:-${NEXT_PUBLIC_SITE_URL}}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID is required"
  echo "Usage: ./deploy-cloudrun.sh [PROJECT_ID] [REGION] [SERVICE_NAME] [NEXT_PUBLIC_SITE_URL]"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
  echo "Warning: NEXT_PUBLIC_SITE_URL not set. Stripe checkout URLs may not work correctly."
  echo "Set it as the 4th argument or via NEXT_PUBLIC_SITE_URL env var"
fi

echo "Building application..."
npm ci
npm run build

echo "Building Docker image..."
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .

echo "Pushing image to Container Registry..."
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest

echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "DEMO_MODE=false,PORT=8080,NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}" \
  --set-secrets "SHOPIFY_STORE_URL=shopify-store-url:latest,SHOPIFY_ACCESS_TOKEN=shopify-access-token:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest" \
  --project ${PROJECT_ID}

echo "Deployment complete!"
echo "Get your MCP server URL:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format 'value(status.url)'

