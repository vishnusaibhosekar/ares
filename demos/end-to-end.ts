/**
 * ARES End-to-End Demo Script
 * 
 * Demonstrates the full ARES workflow:
 * 1. Health check
 * 2. Seed database with test data
 * 3. Ingest a new suspicious storefront
 * 4. Resolve it to an existing operator cluster
 * 5. Fetch cluster details
 * 6. Show matching signals and explanation
 * 
 * Usage: npm run demo
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface HealthResponse {
    status: string;
    database: string;
    embeddings: string;
}

interface SeedResponse {
    sites_created: number;
    entities_created: number;
    clusters_created: number;
    embeddings_created: number;
}

interface IngestResponse {
    site_id: string;
    entities_extracted: number;
    embeddings_generated: number;
    resolution?: {
        cluster_id: string;
        confidence: number;
        matching_signals: string[];
        explanation: string;
    };
}

interface ClusterResponse {
    cluster: {
        id: string;
        name: string;
        confidence: number;
    };
    sites: Array<{
        domain: string;
        first_seen_at: string;
    }>;
    entities: Array<{
        type: string;
        value: string;
        sites_using: number;
    }>;
    risk_score: number;
    total_unique_entities: number;
}

function printHeader(text: string) {
    console.log('\n' + '='.repeat(50));
    console.log(`  ${text}`);
    console.log('='.repeat(50) + '\n');
}

function printStep(step: number, text: string) {
    console.log(`\n📌 Step ${step}: ${text}`);
    console.log('-'.repeat(40));
}

async function main() {
    printHeader('ARES End-to-End Resolution Demo');

    try {
        // Step 1: Health check
        printStep(1, 'Checking API health...');
        const healthRes = await axios.get<HealthResponse>(`${BASE_URL}/health`, {
            validateStatus: () => true // Accept any status code
        });
        console.log(`API Status: ${healthRes.data.status}`);
        console.log(`   Database: ${healthRes.data.database}`);
        console.log(`   Embeddings: ${healthRes.data.embeddings}`);

        // Check if database is connected
        if (healthRes.data.database !== 'connected') {
            console.log('\n⚠️  Database is not connected!');
            console.log('   To run the full demo, set up your database:');
            console.log('   1. Set DATABASE_URL in .env');
            console.log('   2. Run: npm run db:migrate');
            console.log('   3. Restart the server: npm run dev');
            console.log('\n   Exiting demo...');
            return;
        }
        console.log(`✅ All systems operational`);

        // Step 2: Seed database
        printStep(2, 'Seeding database with test data...');
        const seedRes = await axios.post<SeedResponse>(`${BASE_URL}/api/seeds`, {
            count: 10,
            include_matches: true
        });
        console.log(`✅ Seeded successfully:`);
        console.log(`   Sites created: ${seedRes.data.sites_created}`);
        console.log(`   Entities created: ${seedRes.data.entities_created}`);
        console.log(`   Clusters created: ${seedRes.data.clusters_created}`);

        // Step 3: Ingest a new suspicious site
        printStep(3, 'Ingesting a new counterfeit storefront...');

        const testPhone = '+86 138 1234 5678';
        const testEmail = 'support@replica-outlet.cn';

        const ingestRes = await axios.post<IngestResponse>(`${BASE_URL}/api/ingest-site`, {
            url: 'https://luxury-replica-megastore.ru',
            domain: 'luxury-replica-megastore.ru',
            page_text: `Welcome to Luxury Outlet! 
        We offer 100% authentic designer replicas at outlet prices.
        Contact us on WhatsApp: ${testPhone}
        Email: ${testEmail}
        Fast worldwide shipping. 30-day returns on all items.
        Terms: No refunds on sale items. Shipping takes 7-14 days.`,
            entities: {
                phones: [testPhone],
                emails: [testEmail]
            },
            attempt_resolve: true,
            use_llm_extraction: false
        });

        console.log(`✅ Site ingested successfully:`);
        console.log(`   Site ID: ${ingestRes.data.site_id}`);
        console.log(`   Entities extracted: ${ingestRes.data.entities_extracted}`);
        console.log(`   Embeddings generated: ${ingestRes.data.embeddings_generated}`);

        // Step 4: Check resolution result
        if (ingestRes.data.resolution) {
            const resolution = ingestRes.data.resolution;

            printStep(4, 'Resolution Result');
            console.log(`✅ Matched to existing operator cluster!`);
            console.log(`   Cluster ID: ${resolution.cluster_id}`);
            console.log(`   Confidence: ${(resolution.confidence * 100).toFixed(1)}%`);
            console.log(`   Matching Signals: ${resolution.matching_signals.join(', ')}`);
            console.log(`\n📝 Explanation:`);
            console.log(`   ${resolution.explanation}`);

            // Step 5: Fetch cluster details
            printStep(5, 'Fetching matched cluster details...');
            const clusterRes = await axios.get<ClusterResponse>(
                `${BASE_URL}/api/clusters/${resolution.cluster_id}`
            );
            const cluster = clusterRes.data;

            console.log(`\n🎯 Cluster: "${cluster.cluster.name || 'Unnamed'}"`);
            console.log(`   Risk Score: ${(cluster.risk_score * 100).toFixed(0)}%`);
            console.log(`   Confidence: ${(cluster.cluster.confidence * 100).toFixed(1)}%`);
            console.log(`   Total Unique Entities: ${cluster.total_unique_entities}`);

            console.log(`\n🌐 Sites in cluster (${cluster.sites.length}):`);
            cluster.sites.slice(0, 5).forEach((site, i) => {
                console.log(`   ${i + 1}. ${site.domain}`);
            });
            if (cluster.sites.length > 5) {
                console.log(`   ... and ${cluster.sites.length - 5} more`);
            }

            console.log(`\n🔗 Shared Entities (${cluster.entities.length}):`);
            cluster.entities.slice(0, 5).forEach(entity => {
                console.log(`   - [${entity.type.toUpperCase()}] ${entity.value} (${entity.sites_using} sites)`);
            });
            if (cluster.entities.length > 5) {
                console.log(`   ... and ${cluster.entities.length - 5} more`);
            }

        } else {
            printStep(4, 'Resolution Result');
            console.log(`⚠️  No matching cluster found.`);
            console.log(`   This site appears to be from a new operator.`);
        }

        printHeader('Demo Complete! ✨');
        console.log('Visit http://localhost:5173 to explore the UI.\n');

    } catch (error: any) {
        console.error('\n❌ Error:', error.response?.data || error.message);
        console.error('\nMake sure the backend is running: npm run dev');
        process.exit(1);
    }
}

main();
