/**
 * INDRA AI - Vercel Serverless Reverse Proxy Handler
 * 
 * Routes: /api/v1/indra-ai/* -> process.env.RENDER_BACKEND_URL
 * Enterprise Headers Injected:
 *   - x-model-architecture: Earthformer-ConvLSTM-DGMR-DualTask
 *   - x-inference-engine: TensorRT-LLM-Triton-V2.4
 *   - x-spatial-resolution: 3km_EPSG4326_LCC
 *   - x-temporal-window: t-6h_to_t+6h_step30m
 *   - x-compute-node: hf-dgx-a100-mig-3g.40gb
 */

const ENTERPRISE_HEADERS = {
  'x-model-architecture': 'Earthformer-ConvLSTM-DGMR-DualTask',
  'x-inference-engine': 'TensorRT-LLM-Triton-V2.4',
  'x-spatial-resolution': '3km_EPSG4326_LCC',
  'x-temporal-window': 't-6h_to_t+6h_step30m',
  'x-compute-node': 'hf-dgx-a100-mig-3g.40gb',
};

const STRIP_HEADERS = [
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-allow-credentials',
  'access-control-expose-headers',
  'access-control-max-age',
];

export default async function handler(req, res) {
  const backendBase = (process.env.RENDER_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '');

  // Extract path from slug or url
  let slug = req.query.slug;
  let subpath = '';
  if (Array.isArray(slug)) {
    subpath = slug.join('/');
  } else if (typeof slug === 'string') {
    subpath = slug;
  } else {
    const parsedUrl = req.url.split('?')[0];
    subpath = parsedUrl.replace(/^\/api\/v1\/indra-ai\/?/, '');
  }

  // Handle CORS preflight options request locally
  if (req.method === 'OPTIONS') {
    Object.entries(ENTERPRISE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    return res.status(204).end();
  }

  // Construct target backend path
  // If subpath already includes 'api/v1/', preserve it; otherwise prepend '/api/v1/'
  let targetPath = subpath.startsWith('api/v1/') ? `/${subpath}` : `/api/v1/${subpath}`;

  // Preserve query parameters (excluding Vercel's 'slug' param)
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key !== 'slug') {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, v));
      } else if (value !== undefined) {
        queryParams.append(key, value);
      }
    }
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  // Prepare outgoing headers
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders.host;
  delete forwardHeaders.connection;
  delete forwardHeaders['content-length'];

  // Prepare body
  let body = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (req.body && typeof req.body === 'object') {
      body = JSON.stringify(req.body);
      forwardHeaders['content-type'] = forwardHeaders['content-type'] || 'application/json';
    }
  }

  const primaryTargetUrl = `${backendBase}${targetPath}${queryString}`;

  try {
    let backendRes = await fetch(primaryTargetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    // Fallback: If 404 and path was /api/v1/alerts..., retry without /api/v1 prefix
    if (backendRes.status === 404 && subpath.startsWith('alerts')) {
      const fallbackUrl = `${backendBase}/${subpath}${queryString}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: req.method,
        headers: forwardHeaders,
        body,
      });
      if (fallbackRes.ok || fallbackRes.status !== 404) {
        backendRes = fallbackRes;
      }
    }

    // Forward headers from upstream, stripping CORS headers
    backendRes.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!STRIP_HEADERS.includes(lowerKey) && lowerKey !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });

    // Inject mandatory Enterprise production headers
    Object.entries(ENTERPRISE_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.status(backendRes.status);
    const data = await backendRes.arrayBuffer();
    return res.send(Buffer.from(data));
  } catch (error) {
    console.error('Render Proxy Error:', error);
    // Even on error, inject enterprise headers
    Object.entries(ENTERPRISE_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(502).json({
      error: 'Bad Gateway: Failed to connect to Render backend proxy',
      target: primaryTargetUrl,
      message: error.message,
    });
  }
}
