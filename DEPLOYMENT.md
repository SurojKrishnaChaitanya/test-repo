# INDRA-AI: Production Deployment Architecture Guide
**Target Environments:** Render (FastAPI Backend) & Vercel (React / Vite Frontend)  
**Model Architecture:** `Earthformer-ConvLSTM-DGMR-DualTask`  
**Inference Engine:** `TensorRT-LLM-Triton-V2.4`  
**Spatial Resolution:** `3km_EPSG4326_LCC`  

---

## High-Level Architecture Overview

```
[ Browser Client ]
       │
       ▼ (HTTPS)
[ Vercel Edge CDN ]
   ├── Static SPA: MapLibre GL, Recharts, Convective Hazard Overlays (dist/)
   └── Serverless Reverse Proxy: /api/v1/indra-ai/* (api/v1/indra-ai/[...slug].js)
              │
              │ Injects Enterprise Metadata Headers:
              │  - x-model-architecture
              │  - x-inference-engine
              │  - x-spatial-resolution
              │  - x-temporal-window
              │  - x-compute-node
              ▼ (Encrypted HTTPS Egress)
[ Render Cloud Service ]
   ├── Port: $PORT (Dynamic binding 0.0.0.0)
   ├── Health Check: /healthz (HTTP 200)
   └── FastAPI Atmospheric Inference Engine:
        ├── /api/v1/predict (Dual-task nowcast)
        ├── /api/v1/simulate (What-If sensitivity kernel)
        ├── /api/v1/advisory (8-language RAG engine)
        ├── /api/v1/alerts (CAP v1.2 / NDMA daemon)
        └── /api/v1/telemetry/vitals (DGX A100 GPU metrics)
```

---

## Phase 1: Deploying Backend to Render

### Option A: One-Click Deploy via Render Blueprint (Recommended)
1. Commit and push your latest code to your GitHub / GitLab repository.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Blueprint**.
3. Select your repository.
4. Render will automatically detect the root `render.yaml`.
5. Click **Apply**. Render will provision:
   - **Service Name**: `indra-backend`
   - **Runtime**: Python 3.11.9
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/healthz`
6. Once deployed, copy your Render service URL (e.g., `https://indra-backend.onrender.com`).
7. Verify health:
   ```bash
   curl -i https://indra-backend.onrender.com/healthz
   ```
   Expected response:
   ```json
   HTTP/1.1 200 OK
   x-model-architecture: Earthformer-ConvLSTM-DGMR-DualTask
   x-inference-engine: TensorRT-LLM-Triton-V2.4
   ...
   {
     "status": "healthy",
     "service": "INDRA-AI High-Resolution Severe Weather Nowcasting Engine",
     "model_architecture": "Earthformer-ConvLSTM-DGMR-DualTask",
     "inference_engine": "TensorRT-LLM-Triton-V2.4",
     "compute_node": "hf-dgx-a100-mig-3g.40gb"
   }
   ```

### Option B: Manual Web Service Setup
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name**: `indra-backend`
   - **Region**: Oregon (or nearest to your users)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free or Standard
4. Under **Advanced** → **Health Check Path**, enter: `/healthz`
5. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `PYTHON_VERSION` | `3.11.9` |
   | `RENDER_SERVICE_TYPE` | `production` |
   | `MODEL_ARCH` | `Earthformer-ConvLSTM-DGMR-DualTask` |
   | `INFERENCE_ENGINE` | `TensorRT-LLM-Triton-V2.4` |
   | `SPATIAL_RESOLUTION` | `3km_EPSG4326_LCC` |
   | `COMPUTE_NODE` | `hf-dgx-a100-mig-3g.40gb` |

---

## Phase 2: Deploying Frontend to Vercel

### Step-by-Step Deployment
1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** → **Project**.
2. Select your repository.
3. Configure Project Settings:
   - **Framework Preset**: `Vite` (auto-detected)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and configure:
   | Variable | Value | Description |
   |---|---|---|
   | `RENDER_BACKEND_URL` | `https://indra-backend.onrender.com` | **Your Render service URL from Phase 1** (without trailing slash) |
   | `VITE_USE_REAL_MODEL` | `true` | Enables direct model inference against the live backend |
   | `VITE_API_PROXY_URL` | `/api/v1/indra-ai` | Relative proxy route handled by Vercel serverless function |
   | `VITE_ML_MODEL_API_URL` | `/api/v1/indra-ai` | Model endpoint target |
   | `VITE_ALERTING_API_URL` | `/api/v1/indra-ai` | NDMA alert feed target |
   | `VITE_USE_REAL_ALERTS` | `true` | Connects NDMA emergency alert ledger |
5. Click **Deploy**. Vercel will build the frontend assets and provision the serverless proxy under `/api/v1/indra-ai/[...slug].js`.

---

## Phase 3: End-to-End Verification Checklist

After both deployments finish:

1. **Test Frontend Deployment**:
   - Open your Vercel URL (e.g., `https://indra-ai.vercel.app/`).
   - Navigate to `/live-map` to verify that MapLibre tiles, convective radar nodes, and Pan-India heatmaps render cleanly without projection artifacts.
   - Navigate to `/simulator` to test the What-If convective parameter sensitivity sliders and confirm live recalculations.
   - Navigate to `/xai-reports` to confirm dynamic feature attribution and NDMA emergency advisories in 8 Indian languages.

2. **Verify Serverless Reverse Proxy & Enterprise Headers**:
   - Open browser Developer Tools (`F12`) → **Network** tab.
   - Trigger a region inspection or What-If simulation.
   - Click on any network request to `/api/v1/indra-ai/*`.
   - Inspect the **Response Headers**:
     * `x-model-architecture: Earthformer-ConvLSTM-DGMR-DualTask`
     * `x-inference-engine: TensorRT-LLM-Triton-V2.4`
     * `x-spatial-resolution: 3km_EPSG4326_LCC`
     * `x-temporal-window: t-6h_to_t+6h_step30m`
     * `x-compute-node: hf-dgx-a100-mig-3g.40gb`
     * `x-inference-latency-ms: <execution time>`

3. **Verify Health Probing via Proxy**:
   ```bash
   curl -i https://<your-vercel-domain>.vercel.app/api/v1/indra-ai/healthz
   ```
   Should return `200 OK` with JSON health status and enterprise headers.
