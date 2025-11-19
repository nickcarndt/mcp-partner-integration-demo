#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="mcp-commerce-demo"
SERVICE_NAME="mcp-server"
REGION="us-central1"
ARTIFACT_REGISTRY_REPO="mcp-containers"
IMAGE_NAME="mcp-server"
IMAGE_TAG="latest"
FULL_IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${GREEN}🚀 MCP HTTP Server Deployment to Google Cloud Run${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}⚠️  Google Cloud SDK not found. Installing...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Installing via Homebrew..."
            brew install --cask google-cloud-sdk
        else
            echo -e "${RED}❌ Homebrew not found. Please install Google Cloud SDK manually:${NC}"
            echo "https://cloud.google.com/sdk/docs/install"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Installing Google Cloud SDK for Linux..."
        curl https://sdk.cloud.google.com | bash
        exec -l $SHELL
    else
        echo -e "${RED}❌ Unsupported OS. Please install Google Cloud SDK manually:${NC}"
        echo "https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Google Cloud SDK found${NC}"
echo ""

# Authenticate
echo -e "${YELLOW}🔐 Authenticating with Google Cloud...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "Please authenticate with Google Cloud:"
    gcloud auth login
else
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1)
    echo -e "${GREEN}✅ Already authenticated as: ${ACTIVE_ACCOUNT}${NC}"
fi
echo ""

# Set project
echo -e "${YELLOW}📁 Setting project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}
echo -e "${GREEN}✅ Project set to ${PROJECT_ID}${NC}"
echo ""

# Enable required APIs
echo -e "${YELLOW}🔌 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com --project=${PROJECT_ID}
gcloud services enable artifactregistry.googleapis.com --project=${PROJECT_ID}
gcloud services enable cloudbuild.googleapis.com --project=${PROJECT_ID}
echo -e "${GREEN}✅ APIs enabled${NC}"
echo ""

# Create Artifact Registry repository if it doesn't exist
echo -e "${YELLOW}📦 Checking Artifact Registry repository...${NC}"
if ! gcloud artifacts repositories describe ${ARTIFACT_REGISTRY_REPO} --location=${REGION} --project=${PROJECT_ID} &>/dev/null; then
    echo "Creating Artifact Registry repository..."
    gcloud artifacts repositories create ${ARTIFACT_REGISTRY_REPO} \
        --repository-format=docker \
        --location=${REGION} \
        --description="Docker images for MCP HTTP Server" \
        --project=${PROJECT_ID}
    echo -e "${GREEN}✅ Repository created${NC}"
else
    echo -e "${GREEN}✅ Repository already exists${NC}"
fi
echo ""

# Configure Docker authentication
echo -e "${YELLOW}🐳 Configuring Docker authentication...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
echo -e "${GREEN}✅ Docker configured${NC}"
echo ""

# Check required environment variables
echo -e "${YELLOW}🔍 Checking required environment variables...${NC}"
MISSING_VARS=()

if [ -z "$SHOPIFY_STORE_URL" ]; then
    MISSING_VARS+=("SHOPIFY_STORE_URL")
fi

if [ -z "$SHOPIFY_ACCESS_TOKEN" ]; then
    MISSING_VARS+=("SHOPIFY_ACCESS_TOKEN")
fi

if [ -z "$STRIPE_SECRET_KEY" ]; then
    MISSING_VARS+=("STRIPE_SECRET_KEY")
fi

if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SITE_URL not set. Stripe checkout URLs may not work correctly.${NC}"
    echo "   You can set it later with: gcloud run services update ${SERVICE_NAME} --update-env-vars NEXT_PUBLIC_SITE_URL=YOUR_URL"
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please set them before running this script:"
    echo "  export SHOPIFY_STORE_URL=your-store.myshopify.com"
    echo "  export SHOPIFY_ACCESS_TOKEN=your-token"
    echo "  export STRIPE_SECRET_KEY=your-key"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables set${NC}"
echo ""

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t ${FULL_IMAGE_PATH} .
echo -e "${GREEN}✅ Image built${NC}"
echo ""

# Push image to Artifact Registry
echo -e "${YELLOW}📤 Pushing image to Artifact Registry...${NC}"
docker push ${FULL_IMAGE_PATH}
echo -e "${GREEN}✅ Image pushed${NC}"
echo ""

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${FULL_IMAGE_PATH} \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --ingress all \
    --port 8080 \
    --min-instances 1 \
    --max-instances 3 \
    --cpu 1 \
    --memory 512Mi \
    --set-env-vars "DEMO_MODE=false,SHOPIFY_STORE_URL=${SHOPIFY_STORE_URL},SHOPIFY_ACCESS_TOKEN=${SHOPIFY_ACCESS_TOKEN},STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY},NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-}" \
    --project ${PROJECT_ID}

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format 'value(status.url)')

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✔ Cloud Run URL:${NC}"
echo -e "  ${SERVICE_URL}"
echo ""
echo -e "${GREEN}✔ MCP manifest URL:${NC}"
echo -e "  ${SERVICE_URL}/mcp-manifest.json"
echo ""
echo -e "${GREEN}✔ Health check:${NC}"
echo -e "  ${SERVICE_URL}/healthz"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Test the MCP manifest: curl ${SERVICE_URL}/mcp-manifest.json"
echo "2. Connect ChatGPT using: ${SERVICE_URL}"
echo "3. Update environment variables: gcloud run services update ${SERVICE_NAME} --update-env-vars KEY=VALUE"
echo ""

