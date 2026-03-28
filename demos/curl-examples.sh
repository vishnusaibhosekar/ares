#!/bin/bash

# ARES API cURL Examples
# ========================
# Manual testing reference for all API endpoints
#
# Usage: 
#   chmod +x demos/curl-examples.sh
#   ./demos/curl-examples.sh
#
# Or run individual commands from this file

API_URL="${API_URL:-http://localhost:3000}"

echo "======================================"
echo "  ARES API cURL Examples"
echo "  Base URL: $API_URL"
echo "======================================"
echo ""

# ----------------------------------
# 1. Health Check
# ----------------------------------
echo "1. Health Check"
echo "   GET /health"
echo ""
echo "   \$ curl $API_URL/health"
curl -s "$API_URL/health" | jq .
echo ""
echo ""

# ----------------------------------
# 2. Seed Database (Development Only)
# ----------------------------------
echo "2. Seed Database (dev only)"
echo "   POST /api/seeds"
echo ""
echo "   \$ curl -X POST $API_URL/api/seeds \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"count\": 10, \"include_matches\": true}'"
curl -s -X POST "$API_URL/api/seeds" \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "include_matches": true}' | jq .
echo ""
echo ""

# ----------------------------------
# 3. Ingest Site
# ----------------------------------
echo "3. Ingest Site"
echo "   POST /api/ingest-site"
echo ""
echo "   \$ curl -X POST $API_URL/api/ingest-site \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"url\": \"...\", ...}'"
curl -s -X POST "$API_URL/api/ingest-site" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://fake-designer-bags.shop",
    "domain": "fake-designer-bags.shop",
    "page_text": "Buy authentic designer bags at outlet prices! WhatsApp: +86 138 1234 5678. Fast shipping worldwide. No refunds on discounted items.",
    "entities": {
      "phones": ["+86 138 1234 5678"],
      "emails": ["support@fake-bags.shop"]
    },
    "attempt_resolve": true,
    "use_llm_extraction": false
  }' | jq .
echo ""
echo ""

# ----------------------------------
# 4. Resolve Actor
# ----------------------------------
echo "4. Resolve Actor"
echo "   POST /api/resolve-actor"
echo ""
echo "   \$ curl -X POST $API_URL/api/resolve-actor \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"url\": \"...\", ...}'"
curl -s -X POST "$API_URL/api/resolve-actor" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://luxury-replica-outlet.ru",
    "domain": "luxury-replica-outlet.ru",
    "page_text": "Contact us on WhatsApp for bulk orders. Telegram: @designer_outlet. Policy: No returns on discount items. Shipping: 7-14 business days.",
    "entities": {
      "phones": ["+86 138 1234 5678"],
      "handles": [
        {"type": "telegram", "value": "@designer_outlet"}
      ]
    }
  }' | jq .
echo ""
echo ""

# ----------------------------------
# 5. Get Cluster Details
# ----------------------------------
echo "5. Get Cluster Details"
echo "   GET /api/clusters/:id"
echo ""
echo "   Note: Replace CLUSTER_ID with an actual cluster ID from previous responses"
echo ""
echo "   \$ curl $API_URL/api/clusters/CLUSTER_ID"
echo ""
echo "   (Skipping - requires valid cluster ID)"
echo ""
echo ""

# ----------------------------------
# Summary
# ----------------------------------
echo "======================================"
echo "  All examples executed!"
echo ""
echo "  For more details, see:"
echo "  - demos/sample-payloads.json"
echo "  - PRDs/ARES_BUILD_PHASE_3.md"
echo "======================================"
