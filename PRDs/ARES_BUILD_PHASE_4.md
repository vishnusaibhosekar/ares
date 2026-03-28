# ARES Build Phase 4: Frontend UI & Demo

**Duration**: ~1.5 hours  
**Goal**: Build a simple but polished frontend UI + demo script showcasing end-to-end resolution flow.

**Prerequisites**: Phase 3 complete, all API routes tested.

---

## What to Build

1. **Frontend UI** (React / Next.js) with pages:
   - Dashboard (overview, stats)
   - Ingest Site (form)
   - Resolve Actor (form + live results)
   - Cluster Details (viewer)
2. **Demo Script** (CLI) showing end-to-end resolution
3. **Sample Payloads** (cURL reference)
4. **Documentation** (API walkthrough)

---

## Detailed Instructions for Qoder

### Option A: React Frontend (Recommended for Hackathon)

**Prompt to Qoder:**

```
Create a React frontend for ARES using React 18 + Vite (or Next.js if you prefer).

**Setup:**

Create a new directory: frontend/

Use React 18 + TypeScript + Tailwind CSS + Axios for API calls.

Directory structure:
```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Navigation.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorAlert.tsx
│   │   └── Forms/
│   │       ├── IngestSiteForm.tsx
│   │       ├── ResolveActorForm.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── IngestSite.tsx
│   │   ├── ResolveActor.tsx
│   │   ├── ClusterDetails.tsx
│   │   └── NotFound.tsx
│   ├── hooks/
│   │   ├── useApi.ts (custom hook for API calls)
│   ├── lib/
│   │   ├── api.ts (axios client)
│   │   ├── types.ts (API types)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css (Tailwind)
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env.example
```

**Dependencies:**

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.x",
  "axios": "^1.x",
  "tailwindcss": "^3.x",
  "lucide-react": "^latest"
}

DevDeps:
{
  "@vitejs/plugin-react": "^4.x",
  "vite": "^5.x",
  "typescript": "^5.x",
  "@types/react": "^18.x",
  "@types/react-dom": "^18.x"
}
```

**Pages:**

1. **Dashboard** (/)
   - Header: "ARES - Actor Resolution & Entity Service"
   - Overview cards:
     - Total sites ingested (from /api/stats or hardcoded)
     - Total clusters identified
     - Last resolution (timestamp + result)
   - Links to: Ingest Site, Resolve Actor
   - Recent activity table (last 5 resolution runs)

2. **Ingest Site** (/ingest)
   - Form fields:
     - URL (text input, required)
     - Domain (auto-filled from URL)
     - Page Text (textarea, optional)
     - Screenshot Hash (text, optional)
     - Attempt Resolve (checkbox, default: true)
     - Use LLM Extraction (checkbox, default: false)
   - Submit button
   - Response display:
     - Site ID (copyable)
     - Entities extracted (count)
     - Embeddings generated (count)
     - Resolution result (if attempted)
   - Error alert on failure

3. **Resolve Actor** (/resolve)
   - Form fields:
     - URL (text input, required)
     - Domain (auto-filled)
     - Page Text (textarea)
     - Manual Entity Input:
       - Emails (tag input / multi-line)
       - Phones (tag input / multi-line)
       - Handles (WhatsApp/Telegram/WeChat selector + value)
     - Site ID lookup (optional; if provided, fetch from DB)
   - Submit button
   - Response display:
     - Actor Cluster ID (if matched)
     - Confidence score (percentage bar)
     - Matching signals (badge list: "shared_phone", "similar_policy", etc.)
     - Related domains (list)
     - Related entities (table with count)
     - Explanation (prose text)
   - Loading state while resolving
   - Error alert on failure

4. **Cluster Details** (/clusters/:id)
   - Cluster info card:
     - Cluster ID
     - Name (if available)
     - Confidence
     - Risk Score (visual: low/medium/high with color)
     - Created at
   - Sites in cluster (table):
     - Domain
     - URL
     - First seen
     - Status (link to Ingest/Resolve)
   - Entities table:
     - Type (email, phone, handle)
     - Value (normalized)
     - Count (how many sites use it)
     - Sites using (expandable list)
   - Resolution history (if available):
     - Input domain
     - Confidence
     - Timestamp

**Custom Hook: useApi**

```typescript
// useApi<T>(endpoint, method, options?)
// - Handles loading, error, data states
// - Auto-retries on network error
// - Sets Authorization header if needed
// - Usage: const {data, loading, error} = useApi('/api/clusters/123')
```

**Styling:**

- Use Tailwind CSS (dark mode optional)
- Color scheme: cool grays + brand color (teal/blue)
- Responsive layout (mobile-friendly)
- Loading spinners + skeleton loaders
- Smooth transitions

**Build & Deploy:**

```bash
# Dev
npm run dev

# Production build
npm run build

# Preview
npm run preview
```

All static assets served from frontend/ directory.
```

**Output**: Complete React frontend with all pages, forms, and API integration

---

### Option B: Next.js Frontend (If Preferring SSR)

**Prompt to Qoder:**

```
Alternative: Create a Next.js 14 frontend (simpler deployment, SSR benefits).

Use:
- App Router (src/app/)
- React Server Components where possible
- Tailwind CSS
- Axios for API calls

Structure:
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (Dashboard)
│   │   ├── ingest/
│   │   │   └── page.tsx
│   │   ├── resolve/
│   │   │   └── page.tsx
│   │   └── clusters/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── styles/

Same pages and components as React option.
```

For hackathon: React + Vite is faster to set up. Use Next.js if you want SSR/deployment benefits.
```

**Output**: Next.js frontend (alternative to React)

---

### Demo Script (CLI)

**Prompt to Qoder:**

```
Create demos/end-to-end.ts:

This is a Node.js CLI script that showcases the full ARES workflow.

```typescript
/**
 * ARES End-to-End Demo Script
 * 
 * Demonstrates:
 * 1. Seed database with test data (3 clusters, 10 sites)
 * 2. Ingest a new suspicious storefront
 * 3. Resolve it to an existing operator cluster
 * 4. Fetch cluster details
 * 5. Show matching signals and explanation
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function main() {
  console.log('\\n========================================');
  console.log('  ARES End-to-End Resolution Demo');
  console.log('========================================\\n');

  try {
    // Step 1: Health check
    console.log('Step 1: Checking API health...');
    const healthRes = await axios.get(`${BASE_URL}/health`);
    console.log(`✓ API is healthy: ${healthRes.data.status}\\n`);

    // Step 2: Seed database
    console.log('Step 2: Seeding database with test data...');
    const seedRes = await axios.post(`${BASE_URL}/api/seeds`, {
      count: 10,
      include_matches: true
    });
    console.log(`✓ Seeded ${seedRes.data.created_sites} sites, ${seedRes.data.created_clusters} clusters\\n`);

    // Step 3: Get a random cluster from seed data
    console.log('Step 3: Fetching a seeded cluster...');
    const clustersRes = await axios.get(`${BASE_URL}/api/clusters`, {
      params: { limit: 1 }
    });
    const firstCluster = clustersRes.data[0];
    console.log(`✓ Found cluster: "${firstCluster.name}" with ${firstCluster.sites.length} sites\\n`);

    // Step 4: Create a new site with overlapping entity
    console.log('Step 4: Ingesting a new counterfeit storefront (with shared phone from cluster)...');
    const sharedPhone = firstCluster.entities.find(e => e.type === 'phone')?.value;
    
    const ingestRes = await axios.post(`${BASE_URL}/api/ingest-site`, {
      url: 'https://replica-luxe-megastore.ru',
      domain: 'replica-luxe-megastore.ru',
      page_text: 'Welcome to Luxury Outlet! Fast shipping worldwide. Contact: WhatsApp ' + sharedPhone,
      entities: {
        phones: [sharedPhone]
      },
      attempt_resolve: true,
      use_llm_extraction: false
    });

    console.log(`✓ Site ingested: ${ingestRes.data.site_id}`);
    console.log(`  Entities extracted: ${ingestRes.data.entities_extracted}`);
    console.log(`  Embeddings generated: ${ingestRes.data.embeddings_generated}\\n`);

    // Step 5: Check resolution result
    if (ingestRes.data.resolution) {
      const resolution = ingestRes.data.resolution;
      console.log('Resolution Result:');
      console.log(`  Matched Cluster ID: ${resolution.cluster_id}`);
      console.log(`  Confidence: ${(resolution.confidence * 100).toFixed(1)}%`);
      console.log(`  Matching Signals: ${resolution.matching_signals.join(', ')}`);
      console.log(`  Explanation: ${resolution.explanation}\\n`);

      // Step 6: Fetch full cluster details
      console.log('Step 5: Fetching matched cluster details...');
      const clusterDetailsRes = await axios.get(`${BASE_URL}/api/clusters/${resolution.cluster_id}`);
      const cluster = clusterDetailsRes.data;

      console.log(`\\nCluster: "${cluster.cluster.name}"`);
      console.log(`Risk Score: ${(cluster.risk_score * 100).toFixed(0)}% (0=low, 100=high)`);
      console.log(`\\nSites in cluster (${cluster.sites.length}):`);
      cluster.sites.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.domain} - first seen: ${new Date(site.first_seen_at).toLocaleDateString()}`);
      });

      console.log(`\\nShared Entities (${cluster.total_unique_entities}):`);
      cluster.entities.slice(0, 5).forEach(entity => {
        console.log(`  - [${entity.type.toUpperCase()}] ${entity.value} (used by ${entity.count} sites)`);
      });

    } else {
      console.log('No cluster match found. This site is likely new.\\n');
    }

    console.log('\\n========================================');
    console.log('  Demo Complete! ✓');
    console.log('========================================\\n');

  } catch (error) {
    console.error('\\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
```

**Running the demo:**

```bash
# Start backend in one terminal
npm run dev

# In another terminal
npm run demo
```

**Output**: end-to-end.ts CLI script with realistic flow

---

### cURL Examples

**Prompt to Qoder:**

```
Create demos/curl-examples.sh:

A shell script with all cURL examples for testing the API manually.

```bash
#!/bin/bash

# ARES API Examples
# Base URL: http://localhost:3000

API_URL="${API_URL:-http://localhost:3000}"

echo "======================================"
echo "  ARES API Examples"
echo "======================================"
echo ""

# 1. Health check
echo "1. Health Check"
echo "  \$ curl ${API_URL}/health"
curl -s ${API_URL}/health | jq .
echo ""

# 2. Seed data (dev only)
echo "2. Seed Database (development only)"
echo "  \$ curl -X POST ${API_URL}/api/seeds -H 'Content-Type: application/json' -d '{\"count\": 10}'"
curl -s -X POST ${API_URL}/api/seeds \\
  -H "Content-Type: application/json" \\
  -d '{"count": 10, "include_matches": true}' | jq .
echo ""

# 3. Ingest a site
echo "3. Ingest Site"
echo "  \$ curl -X POST ${API_URL}/api/ingest-site -H 'Content-Type: application/json' -d '{...}'"
curl -s -X POST ${API_URL}/api/ingest-site \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://fake-designer-bags.shop",
    "domain": "fake-designer-bags.shop",
    "page_text": "Buy authentic designer bags at outlet prices! WhatsApp: +86 138 1234 5678. Fast shipping.",
    "attempt_resolve": true
  }' | jq .
echo ""

# 4. Resolve actor
echo "4. Resolve Actor"
echo "  \$ curl -X POST ${API_URL}/api/resolve-actor -H 'Content-Type: application/json' -d '{...}'"
curl -s -X POST ${API_URL}/api/resolve-actor \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://luxury-replica-shop.ru",
    "domain": "luxury-replica-shop.ru",
    "page_text": "Contact: +86 138 1234 5678 on WhatsApp for bulk orders.",
    "entities": {
      "phones": ["+86 138 1234 5678"]
    }
  }' | jq .
echo ""

echo "======================================"
echo "  Done"
echo "======================================"
```

Make it executable:
```bash
chmod +x demos/curl-examples.sh
./demos/curl-examples.sh
```

**Output**: demos/curl-examples.sh with all example calls

---

### Sample Payloads JSON

**Prompt to Qoder:**

```
Create demos/sample-payloads.json:

A reference file with request/response examples for documentation.

```json
{
  "endpoints": {
    "POST /api/ingest-site": {
      "request": {
        "url": "https://fake-luxe-bags.shop",
        "domain": "fake-luxe-bags.shop",
        "page_text": "Welcome to Luxury Outlet! 50% off Louis Vuitton, Gucci, Prada. Contact: +86 138 1234 5678 via WhatsApp. Ships worldwide within 3 days. No returns on sale items.",
        "entities": {
          "phones": ["+86 138 1234 5678"]
        },
        "attempt_resolve": true,
        "use_llm_extraction": false
      },
      "response_success": {
        "site_id": "550e8400-e29b-41d4-a716-446655440000",
        "entities_extracted": 1,
        "embeddings_generated": 1,
        "resolution": {
          "cluster_id": "550e8400-e29b-41d4-a716-446655440001",
          "confidence": 0.87,
          "explanation": "This storefront strongly matches an existing operator cluster based on repeated contact identifiers and semantically similar policy language.",
          "matching_signals": ["shared_phone", "similar_policy_text"]
        }
      }
    },
    "POST /api/resolve-actor": {
      "request": {
        "url": "https://mirror-designer.cn",
        "domain": "mirror-designer.cn",
        "page_text": "Fast shipping worldwide. WhatsApp support 24/7. Telegram: @designer_outlet. Policy: No returns on discount items.",
        "entities": {
          "phones": ["+86 138 1234 5678"],
          "handles": [
            { "type": "telegram", "value": "@designer_outlet" }
          ]
        }
      },
      "response_success": {
        "actor_cluster_id": "550e8400-e29b-41d4-a716-446655440001",
        "confidence": 0.92,
        "related_domains": [
          "fake-luxe-bags.shop",
          "luxury-replica-shop.ru",
          "designer-outlet-china.com"
        ],
        "related_entities": [
          {
            "type": "phone",
            "value": "+8613812345678",
            "count": 5
          },
          {
            "type": "handle",
            "value": "designer_outlet",
            "count": 3
          }
        ],
        "matching_signals": [
          "shared_phone",
          "shared_telegram_handle",
          "similar_policy_text"
        ],
        "explanation": "This domain matches an existing Shenzhen-based operator cluster via shared WhatsApp number (+86 138 1234 5678), shared Telegram handle (@designer_outlet), and near-identical shipping policy language. Confidence: 92%."
      },
      "response_no_match": {
        "actor_cluster_id": null,
        "confidence": 0.45,
        "related_domains": [],
        "related_entities": [],
        "matching_signals": [],
        "explanation": "No matching operator cluster found. This appears to be a new or unrelated storefront."
      }
    },
    "GET /api/clusters/:id": {
      "request": "GET /api/clusters/550e8400-e29b-41d4-a716-446655440001",
      "response_success": {
        "cluster": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "Shenzhen Designer Replica Syndicate",
          "confidence": 0.89,
          "description": "High-confidence operator cluster specializing in luxury brand counterfeit distribution.",
          "created_at": "2024-03-27T14:22:30Z",
          "updated_at": "2024-03-28T09:15:45Z"
        },
        "sites": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "domain": "fake-luxe-bags.shop",
            "url": "https://fake-luxe-bags.shop",
            "first_seen_at": "2024-03-27T14:22:30Z"
          },
          {
            "id": "550e8400-e29b-41d4-a716-446655440003",
            "domain": "luxury-replica-shop.ru",
            "url": "https://luxury-replica-shop.ru",
            "first_seen_at": "2024-03-27T15:10:20Z"
          }
        ],
        "entities": [
          {
            "type": "phone",
            "value": "+8613812345678",
            "normalized_value": "+8613812345678",
            "count": 5,
            "sites_using": ["fake-luxe-bags.shop", "luxury-replica-shop.ru", "designer-outlet-china.com"]
          },
          {
            "type": "email",
            "value": "support@luxeoutlet.cn",
            "normalized_value": "support@luxeoutlet.cn",
            "count": 3,
            "sites_using": ["fake-luxe-bags.shop", "mirror-designer.cn"]
          }
        ],
        "risk_score": 0.78,
        "total_unique_entities": 7,
        "resolution_runs": 12
      }
    }
  }
}
```

**Output**: demos/sample-payloads.json with request/response examples

---

### Updated README with UI Instructions

**Prompt to Qoder:**

```
Update README.md with Frontend section:

```markdown
## Frontend (UI)

The ARES frontend is a React application for visualizing and interacting with the resolution system.

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on http://localhost:5173 (Vite default).

### Pages

- **Dashboard** (/) - Overview of resolution activity
- **Ingest Site** (/ingest) - Add a new suspicious storefront
- **Resolve Actor** (/resolve) - Resolve a site to an operator cluster
- **Cluster Details** (/clusters/:id) - View full cluster information

### Features

- Real-time form validation
- Loading states + spinners
- Error handling + user feedback
- Responsive design (mobile-friendly)
- Copy-to-clipboard for IDs
- Visual confidence indicators

### Deployment

```bash
# Production build
npm run build

# Preview
npm run preview
```

Built files in `frontend/dist/` ready for static hosting (Netlify, Vercel, S3, etc.).
```

Also add:
- Quick start section
- Example workflows (how to use the UI)
- Screenshots placeholder
```

**Output**: Updated README.md with frontend instructions

---

## Validation Checklist

Before finalizing Phase 4, verify:

- [ ] Frontend builds without errors (npm run build)
- [ ] All pages load without 404s
- [ ] Forms validate input correctly
- [ ] API calls work (check browser console)
- [ ] Error messages are user-friendly
- [ ] Loading states are visible
- [ ] Mobile responsive (test on narrow viewport)
- [ ] Dark mode works (if implemented)
- [ ] cURL examples all work (manual testing)
- [ ] Demo script runs end-to-end without errors
- [ ] Sample payloads match actual API responses
- [ ] README is complete + instructions are clear

---

## Testing the Full Stack

Once Phase 4 is complete:

```bash
# Terminal 1: Backend API
npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Demo script
npm run demo

# Manual testing: Visit http://localhost:5173
```

---

## Hackathon Presentation Story

**Elevator Pitch:**

"ARES is a standalone identity resolution service that identifies the operators behind counterfeit storefronts. Given a suspicious site's contact info and policy text, ARES links it to existing operator clusters using entity matching + semantic similarity. Built with Qoder (agentic development) and Insforge (agent-native backend), ARES demonstrates real AI-native software engineering at hackathon scale."

**Live Demo Flow:**

1. Open http://localhost:3000/health → API is running
2. Visit http://localhost:5173 → Frontend dashboard
3. Click "Seed Data" → Database populates with test clusters
4. Visit "Resolve Actor" page
5. Enter a new suspicious URL + paste a shared phone number from the seeded data
6. Hit "Resolve" → Shows matched cluster with 85%+ confidence
7. Click cluster ID → Shows full operator profile (related domains, entities, risk score)
8. Run demo script in terminal → Shows entire flow in CLI

**Why judges like it:**

- Clear problem (identity resolution is hard)
- Real architecture (not toy code)
- Qoder story: Agentic development built a production service
- Insforge story: Backend primitives enabled agents to understand + build features
- Shippable: full stack (API + UI + demo) in ~6 hours
- Complementary to AEGE ecosystem (not rebuilding discovery/evidence)

---

## Next Steps

Once Phase 4 is complete:

1. Test entire stack locally
2. Run demo script
3. Prepare presentation materials
4. Document any known limitations
5. Proceed to **ARES_IMPLEMENTATION_NOTES** (LLM extraction details) if needed

This completes the ARES MVP for hackathon submission! 🚀
