# Development Seeding Endpoint

<cite>
**Referenced Files in This Document**
- [seeds.ts](file://src/api/routes/seeds.ts)
- [server.ts](file://src/api/server.ts)
- [api.ts](file://src/domain/types/api.ts)
- [env.ts](file://src/util/env.ts)
- [sample-payloads.json](file://demos/sample-payloads.json)
- [curl-examples.sh](file://demos/curl-examples.sh)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Endpoint Specification](#endpoint-specification)
3. [Request Payload Structure](#request-payload-structure)
4. [Response Format](#response-format)
5. [Security Restrictions](#security-restrictions)
6. [Seeding Scenarios](#seeding-scenarios)
7. [Implementation Status](#implementation-status)
8. [Testing and Examples](#testing-and-examples)
9. [Cleanup Procedures](#cleanup-procedures)
10. [Idempotency Behavior](#idempotency-behavior)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Conclusion](#conclusion)

## Introduction

The POST /api/seeds endpoint is a development-only API designed for populating test environments with synthetic data for fraud detection research and system testing. This endpoint enables rapid setup of realistic test scenarios by generating sites, entities, clusters, and resolution runs with configurable parameters.

The seeding functionality is intentionally restricted to development environments to prevent accidental data contamination in production systems. The endpoint supports multiple predefined scenarios that simulate different types of fraudulent networks and attack patterns commonly encountered in e-commerce and digital marketplace fraud detection.

## Endpoint Specification

### Base URL
```
POST /api/seeds
```

### Security Context
- **Environment Restriction**: Available only in development mode
- **Access Control**: No authentication required (development-only)
- **Deployment Scope**: Automatically disabled in production environments

### Content Type
- `application/json`

## Request Payload Structure

The seeding endpoint accepts a JSON payload with the following structure:

```json
{
  "scenario": "counterfeit_network",
  "count": 10
}
```

### Payload Parameters

| Parameter | Type | Required | Description | Valid Values |
|-----------|------|----------|-------------|--------------|
| scenario | string | No | Defines the type of test data to generate | `counterfeit_network`, `single_actor`, `multiple_clusters` |
| count | number | No | Controls the quantity of data to generate | Integer between 1-100 |

### Scenario Types

The system supports three distinct seeding scenarios:

1. **counterfeit_network**: Creates interconnected networks of fake e-commerce sites
2. **single_actor**: Generates data for testing individual fraudulent operators  
3. **multiple_clusters**: Produces several separate fraudulent networks

## Response Format

The endpoint responds with a structured JSON object containing creation statistics:

```json
{
  "sites_created": 15,
  "entities_created": 87,
  "clusters_created": 3,
  "embeddings_created": 120
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| sites_created | number | Number of site records successfully created |
| entities_created | number | Number of entity records successfully created |
| clusters_created | number | Number of cluster records successfully created |
| embeddings_created | number | Number of embedding records successfully created |

## Security Restrictions

### Environment-Based Access Control

The seeding endpoint operates under strict environment-based restrictions:

```typescript
// Server configuration - Development-only endpoint
if (process.env.NODE_ENV === 'development') {
  app.use('/api/seeds', seedsRouter);
}
```

### Security Implications

- **Production Safety**: Endpoint is completely disabled in production environments
- **Development Focus**: Designed exclusively for local testing and CI/CD pipelines
- **No Authentication**: Intentionally unauthenticated for easy automation
- **Data Isolation**: Generated data is isolated to development databases

### Environment Configuration

The system validates environment variables and NODE_ENV settings:

```typescript
// Environment validation ensures proper configuration
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}
```

## Seeding Scenarios

### Counterfeit Network Scenario
Creates interconnected networks of fake e-commerce platforms sharing common fraudulent patterns. This scenario generates:
- Multiple fake storefronts with realistic domain names
- Shared contact information across networks
- Interconnected entity relationships
- Realistic embedding patterns for machine learning testing

### Single Actor Scenario  
Focuses on individual fraudulent operators with:
- One primary fake website
- Multiple associated contact methods
- Consistent fraudulent patterns
- Representative embedding signatures

### Multiple Clusters Scenario
Generates several independent fraudulent networks:
- Three separate counterfeit networks
- Minimal cross-connections between clusters
- Diverse fraudulent patterns within each cluster
- Realistic distribution of suspicious activities

## Implementation Status

### Current State
The endpoint is currently in development phase with placeholder implementation:

```typescript
// Current implementation returns NotImplemented status
res.status(501).json({ error: 'Not implemented' });
```

### Planned Features (Phase 4)
The complete implementation will include:
- Database seeding with realistic test data
- Configurable data generation parameters
- Batch operation support
- Cleanup and reset capabilities
- Idempotent operation handling

## Testing and Examples

### Curl Examples

Basic seeding request:
```bash
curl -X POST http://localhost:3000/api/seeds \
  -H "Content-Type: application/json" \
  -d '{"scenario": "counterfeit_network"}'
```

Custom count specification:
```bash
curl -X POST http://localhost:0/api/seeds \
  -H "Content-Type: application/json" \
  -d '{"scenario": "multiple_clusters", "count": 5}'
```

### Automated Testing Integration

The endpoint is designed for CI/CD pipeline integration:

```json
{
  "description": "Seed test data for integration tests",
  "request": {
    "scenario": "counterfeit_network",
    "count": 10
  }
}
```

### Test Data Generation Patterns

The system generates realistic test data patterns based on:
- Domain name generation algorithms
- Entity extraction templates
- Fraud pattern simulation
- Embedding vector generation

## Cleanup Procedures

### Data Management
- **Automatic Cleanup**: Test data is isolated to development databases
- **Reset Operations**: Support planned for data reset functionality
- **Cleanup Scripts**: Database cleanup procedures in development scripts
- **Environment Isolation**: Test data does not affect production environments

### Best Practices
- Use dedicated development databases for test data
- Implement regular cleanup in CI/CD pipelines
- Monitor database growth in development environments
- Use environment-specific cleanup procedures

## Idempotency Behavior

### Current State
The endpoint is not yet implemented and therefore does not exhibit idempotent behavior.

### Planned Implementation
Future versions will support idempotent operations:
- Duplicate requests will not create additional data
- Consistent response format regardless of repeat calls
- Conflict resolution for existing test data
- Atomic operation handling

## Troubleshooting Guide

### Common Issues

**Endpoint Not Found**
```bash
# Verify development mode
NODE_ENV=development npm start
```

**Environment Configuration Errors**
```bash
# Check required environment variables
DATABASE_URL=postgresql://localhost:5432/ares_dev
```

**Validation Errors**
```json
{
  "error": "Validation failed",
  "message": "Scenario must be one of: counterfeit_network, single_actor, multiple_clusters"
}
```

### Debug Information

The system provides detailed logging for development troubleshooting:
- Request ID tracking for correlation
- Environment-specific error messages
- Configuration validation feedback
- Database connection status

## Conclusion

The POST /api/seeds endpoint represents a crucial development tool for ARES testing infrastructure. While currently in development phase, it provides a foundation for comprehensive test data generation supporting multiple fraud detection scenarios.

Key benefits include:
- Rapid test environment setup
- Configurable data generation parameters
- Environment-based security controls
- Integration-ready for automated testing
- Scalable to various testing scenarios

The endpoint's development-only restriction ensures safety while providing flexibility for research and testing activities. Future implementations will enhance functionality with advanced cleanup procedures, idempotent operations, and expanded scenario support.