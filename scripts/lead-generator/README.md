# Singapore Lead Generation System

A standalone system for generating leads from Singapore-based companies using JigsawStack for web scraping, OpenAI for analysis, and Supabase for data storage.

## Overview

This system automatically:
1. Analyzes existing leads to identify patterns and optimize search queries
2. Generates Singapore-focused search queries
3. Finds LinkedIn company profiles using JigsawStack
4. Scrapes data from these profiles
5. Enriches missing data using OpenAI
6. Analyzes the data for AI readiness
7. Stores the results in Supabase

## Prerequisites

- Python 3.8+
- Node.js 14+
- Supabase account
- JigsawStack API key
- OpenAI API key

## Installation

### Python Dependencies

```bash
cd scripts/lead-generator
pip install -r requirements.txt
```

### Node.js Dependencies (for API server)

```bash
cd scripts/lead-generator
npm install
```

## Configuration

Create a `.env` file in the `scripts/lead-generator` directory with the following content:

```
JIGSAWSTACK_API_KEY=your_jigsawstack_api_key
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

## Usage

### Running the Python Script Directly

```bash
# On Windows
python lead_generator.py --count 5 --target-profile "{\"employeeCount\": \"50-200\", \"preferredType\": \"Startup\"}"

# On Linux/macOS
python lead_generator.py --count 5 --target-profile '{"employeeCount": "50-200", "preferredType": "Startup"}'
```

Options:
- `--count`: Number of leads to generate (default: 5)
- `--target-profile`: JSON string with target profile parameters (default: {})
- `--job-id`: Optional job ID for tracking (default: auto-generated UUID)
- `--verbose`: Enable verbose logging
- `--analyze-only`: Only analyze existing leads, do not generate new ones

### Running the API Server

```bash
npm start
```

The server will start on port 3000 (or the port specified in the PORT environment variable).

## API Endpoints

- `GET /api/analyze-leads`: Analyze existing leads to generate search parameters
  - Response: `{ "success": true, "results": { "industries": [...], "company_sizes": [...], "keywords": [...] } }`

- `POST /api/generate-leads`: Start lead generation
  - Request body: `{ "count": 5, "targetProfile": { "employeeCount": "50-200" } }`
  - Response: `{ "success": true, "jobId": "uuid", "message": "Lead generation job started" }`

- `GET /api/check-status/:jobId`: Check job status
  - Response: `{ "status": "processing|complete|error", "message": "..." }`

- `GET /api/logs/:jobId`: Get job logs
  - Response: `{ "logs": "..." }`

## Simplified Data Model

The system uses a simplified data model with these key fields:

- `company_name`: Name of the company
- `employee_count`: Number of employees
- `is_sme`: Whether the company is an SME
- `about`: Company description
- `industry`: Industry category
- `ai_readiness`: AI readiness category (AI Unaware, AI Aware, AI Ready, AI Competent)
- `lead_source`: Source of the lead (always "LinkedIn")
- `status`: Status of the lead (new, qualified, etc.)
- `email`: Generated email based on website domain
- `source_url`: Original LinkedIn URL

## Supabase Tables

The system uses two tables in Supabase:

1. `leads`: Stores the generated leads
2. `lead_generation_jobs`: Tracks the status of lead generation jobs

### Updating Supabase Tables

A migration file has been created to update your Supabase tables to match the simplified data model:

```
supabase/migrations/20250322053600_update_lead_tables.sql
```

This migration will:
- Drop the columns that are no longer needed (company_size, founded, ai_readiness_score, ai_readiness_category, company_type)
- Ensure all required columns exist
- Create the lead_generation_jobs table if it doesn't exist
- Add indexes for better performance

You can ask Bolt to apply this migration to update your Supabase database.

## License

MIT
