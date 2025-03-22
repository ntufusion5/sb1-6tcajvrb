#!/usr/bin/env python3
"""
Lead Generation System
A standalone script that finds, analyzes, and stores company leads,
focusing on Singapore-based companies.
"""

import argparse
import json
import os
import sys
import time
import logging
import uuid
import re
from jigsawstack import JigsawStack
import openai
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("lead_generation.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('lead_generation')

def initialize_clients():
    """Initialize API clients for JigsawStack, OpenAI, and Supabase"""
    logger.info("Initializing API clients...")
    
    # Check environment variables
    jigsawstack_api_key = os.environ.get('JIGSAWSTACK_API_KEY')
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
    
    if not jigsawstack_api_key:
        raise ValueError("JIGSAWSTACK_API_KEY environment variable is not set")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    if not supabase_url:
        raise ValueError("SUPABASE_URL environment variable is not set")
    if not supabase_key:
        raise ValueError("SUPABASE_SERVICE_KEY environment variable is not set")
    
    logger.info(f"JIGSAWSTACK_API_KEY exists: {bool(jigsawstack_api_key)}")
    logger.info(f"OPENAI_API_KEY exists: {bool(openai_api_key)}")
    logger.info(f"SUPABASE_URL exists: {bool(supabase_url)}")
    logger.info(f"SUPABASE_SERVICE_KEY exists: {bool(supabase_key)}")
    
    # Initialize clients
    try:
        jigsawstack_client = JigsawStack(api_key=jigsawstack_api_key)
        logger.info("JigsawStack client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize JigsawStack client: {str(e)}")
        raise
    
    try:
        openai_client = openai.Client(api_key=openai_api_key)
        logger.info("OpenAI client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {str(e)}")
        raise
    
    try:
        supabase_client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise
    
    return jigsawstack_client, openai_client, supabase_client

def update_job_status(supabase_client, job_id, status, message):
    """Update job status in Supabase"""
    try:
        logger.info(f"Updating job status to '{status}' for job {job_id}")
        supabase_client.table('lead_generation_jobs').upsert({
            'job_id': job_id,
            'status': status,
            'message': message,
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ')
        }).execute()
        logger.info(f"Job status updated successfully")
    except Exception as e:
        logger.error(f"Error updating job status: {str(e)}")
        raise

def analyze_existing_leads(supabase_client, openai_client):
    """Analyze existing leads to generate optimized search queries"""
    logger.info("Analyzing existing leads to generate optimized search queries...")
    
    # Fetch existing leads from Supabase
    try:
        response = supabase_client.table('leads').select('*').limit(20).execute()
        existing_leads = response.data
        logger.info(f"Retrieved {len(existing_leads)} existing leads for analysis")
    except Exception as e:
        logger.error(f"Error fetching existing leads: {str(e)}")
        return default_search_parameters()
    
    if not existing_leads:
        logger.info("No existing leads found, using default search parameters")
        return default_search_parameters()
    
    # Prepare data for OpenAI analysis
    lead_data = json.dumps(existing_leads)
    
    prompt = f"""
    Analyze these existing leads:
    {lead_data}
    
    Based on this data, identify:
    1. The most promising industries in Singapore
    2. Optimal company sizes for Singapore-based SMEs
    3. Keywords that could help find similar high-quality leads in Singapore
    
    Return a JSON object with these search parameters:
    {{
      "industries": ["industry1", "industry2", ...],
      "company_sizes": ["10-50", "50-200", ...],
      "keywords": ["keyword1", "keyword2", ...]
    }}
    """
    
    try:
        logger.info("Sending analysis request to OpenAI...")
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=500
        )
        
        content = response.choices[0].message.content
        logger.info(f"Received response from OpenAI: {content[:100]}...")
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            search_params = json.loads(json_match.group(0))
            logger.info(f"Successfully parsed search parameters: {search_params}")
            return search_params
        else:
            logger.warning("Could not extract JSON from OpenAI response")
    except Exception as e:
        logger.error(f"Error analyzing existing leads: {str(e)}")
    
    logger.info("Using default search parameters")
    return default_search_parameters()

def default_search_parameters():
    """Return default search parameters"""
    return {
        "industries": ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail"],
        "company_sizes": ["10-50", "50-200"],
        "keywords": ["SME", "Singapore", "startup"]
    }

def generate_search_queries(openai_client, search_params, count):
    """Generate Singapore-focused search queries"""
    logger.info(f"Generating {count} search queries based on search parameters...")
    
    industries = ", ".join(search_params.get("industries", ["Technology"]))
    company_sizes = ", ".join(search_params.get("company_sizes", ["10-50"]))
    keywords = ", ".join(search_params.get("keywords", ["SME"]))
    
    prompt = f"""
    Generate {count} search queries to find LinkedIn company profiles for businesses in Singapore with these characteristics:
    - Industries: {industries}
    - Company sizes: {company_sizes}
    - Keywords: {keywords}
    
    Every query MUST include "Singapore" to ensure we only find Singapore-based companies.
    The queries should focus on finding SMEs in Singapore.
    Return the queries as a JSON array of strings.
    """
    
    try:
        logger.info("Sending query generation request to OpenAI...")
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500
        )
        
        content = response.choices[0].message.content
        logger.info(f"Received response from OpenAI: {content[:100]}...")
        
        # Extract JSON array from response
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            queries = json.loads(json_match.group(0))
            logger.info(f"Successfully parsed {len(queries)} queries from JSON")
        else:
            # Fallback: split by newlines and clean up
            logger.warning("Could not find JSON array in response, using fallback parsing")
            queries = [line.strip().strip('"-,') for line in content.split('\n') 
                      if line.strip() and not line.strip().startswith('{') and not line.strip().startswith('}')]
            logger.info(f"Parsed {len(queries)} queries using fallback method")
        
        # Ensure all queries include "Singapore"
        final_queries = []
        for query in queries:
            if "singapore" not in query.lower():
                query = f"{query} Singapore"
            final_queries.append(query)
            
        # Ensure we have the requested number of queries
        while len(final_queries) < count:
            final_queries.append(f"Singapore SME {len(final_queries) + 1}")
            
        return final_queries[:count]
        
    except Exception as e:
        logger.error(f"Error generating search queries: {str(e)}")
        # Fallback queries
        fallback_queries = [
            "Singapore SME technology companies",
            "Singapore small businesses",
            "Singapore startups",
            "Singapore medium enterprises",
            "Singapore local businesses"
        ]
        logger.info(f"Using {len(fallback_queries[:count])} fallback queries due to error")
        return fallback_queries[:count]

def find_linkedin_urls(jigsawstack_client, search_queries):
    """Find LinkedIn URLs for the given search queries"""
    logger.info(f"Finding LinkedIn URLs for {len(search_queries)} search queries...")
    linkedin_urls = []
    
    for i, query in enumerate(search_queries):
        logger.info(f"Processing query {i+1}/{len(search_queries)}: '{query}'")
        
        # Add a small delay between requests to avoid rate limiting
        if i > 0:
            time.sleep(1)
        
        try:
            # Search for LinkedIn company URL
            search_params = {
                "query": f"{query} company linkedin",
                "ai_overview": True,
                "safe_search": "moderate",
                "spell_check": True
            }
            
            logger.info(f"Sending search request to JigsawStack...")
            search_results = jigsawstack_client.web.search(search_params)
            results = search_results.json().get("results", [])
            logger.info(f"Received {len(results)} search results")
            
            # Extract LinkedIn URLs from search results
            found_url = False
            for result in results:
                url = result.get("url", "")
                if "linkedin.com/company/" in url:
                    logger.info(f"Found LinkedIn URL: {url}")
                    linkedin_urls.append(url)
                    found_url = True
                    break  # Take the first LinkedIn URL for each query
            
            if not found_url:
                logger.warning(f"No LinkedIn URL found for query: '{query}'")
                
        except Exception as e:
            logger.error(f"Error searching for '{query}': {str(e)}")
    
    logger.info(f"Found {len(linkedin_urls)} LinkedIn URLs in total")
    return linkedin_urls

def scrape_linkedin_profiles(jigsawstack_client, linkedin_urls):
    """Scrape data from LinkedIn profiles"""
    logger.info(f"Scraping data from {len(linkedin_urls)} LinkedIn profiles...")
    lead_data = []
    
    for i, url in enumerate(linkedin_urls):
        logger.info(f"Scraping profile {i+1}/{len(linkedin_urls)}: {url}")
        
        # Add a small delay between requests to avoid rate limiting
        if i > 0:
            time.sleep(2)
        
        try:
            # Scrape LinkedIn profile
            scrape_params = {
                "url": url,
                "element_prompts": ["Company size", "Industry", "Website", "About"]
            }
            
            logger.info(f"Sending scrape request to JigsawStack...")
            result = jigsawstack_client.web.ai_scrape(scrape_params)
            data = result.json().get("context", {})
            logger.info(f"Received scrape data: {json.dumps(data)[:100]}...")
            
            # Ensure all prompts are present in the data
            for prompt in scrape_params["element_prompts"]:
                value = data.setdefault(prompt, ["-"])
                # If the value is an empty list, replace it with '-'
                if isinstance(value, list) and not value:
                    data[prompt] = "-"
                elif isinstance(value, list):
                    # Join list elements into a comma-separated string
                    data[prompt] = ", ".join(map(str, value))
            
            # Add source URL
            data["source_url"] = url
            
            # Extract company name from LinkedIn URL
            company_slug = url.split("linkedin.com/company/")[1].split("/")[0].split("?")[0]
            company_name = company_slug.replace("-", " ").title()
            data["company_name"] = company_name
            
            logger.info(f"Successfully scraped data for: {company_name}")
            lead_data.append(data)
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
    
    logger.info(f"Successfully scraped data for {len(lead_data)} profiles")
    return lead_data

def enrich_about_section(openai_client, lead):
    """Generate or enhance the About section if missing or minimal"""
    about = lead.get("About", "")
    
    # If About section is substantial, return as is
    if len(about) > 100 and about != "-":
        return about
    
    company_name = lead.get("company_name", "")
    industry = lead.get("Industry", "")
    
    logger.info(f"Enriching About section for {company_name}")
    
    prompt = f"""
    Generate a brief company description for a Singapore-based company:
    - Company Name: {company_name}
    - Industry: {industry}
    
    Write 2-3 sentences describing what this Singapore company likely does, its target market within Singapore or Southeast Asia, and its potential value proposition.
    """
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=150
        )
        
        enhanced_about = response.choices[0].message.content.strip()
        if enhanced_about:
            logger.info(f"Successfully generated About section for {company_name}")
            return enhanced_about
    except Exception as e:
        logger.error(f"Error enriching About section: {str(e)}")
    
    return about

def analyze_ai_readiness(openai_client, about_text, industry):
    """Determine AI readiness category"""
    logger.info(f"Analyzing AI readiness for industry: {industry}")
    
    prompt = f"""
    Based on the AI Readiness categories:
    - AI Unaware: Unaware of AI applications.
    - AI Aware: Aware but limited use cases.
    - AI Ready: Can integrate AI into processes.
    - AI Competent: Develops custom AI solutions.
    
    Given the following company information:
    - Company Description: "{about_text}"
    - Industry: "{industry}"
    
    Analyze the AI readiness based on the company description and industry.
    If no AI usage is detected, return "AI Unaware".
    
    Return only one of these categories: "AI Unaware", "AI Aware", "AI Ready", or "AI Competent".
    """
    
    try:
        logger.info("Sending AI readiness analysis request to OpenAI...")
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=50
        )
        result = response.choices[0].message.content.strip()
        
        # Ensure the result is one of the valid categories
        valid_categories = ["AI Unaware", "AI Aware", "AI Ready", "AI Competent"]
        for category in valid_categories:
            if category.lower() in result.lower():
                logger.info(f"AI readiness determined: {category}")
                return category
        
        logger.warning(f"Could not determine AI readiness from response: {result}")
        return "AI Unaware"
    except Exception as e:
        logger.error(f"Error getting AI readiness: {str(e)}")
        return "AI Unaware"

def determine_is_sme(company_size):
    """Determine if a company is an SME based on its size"""
    try:
        # Try to extract numeric value from company size
        size_match = re.search(r'\d+', str(company_size))
        if size_match:
            employee_count = int(size_match.group())
            # SMEs typically have fewer than 200 employees
            return employee_count < 200
    except:
        pass
    
    # Default to True if we can't determine
    return True

def process_leads(openai_client, leads):
    """Process and enrich lead data"""
    logger.info(f"Processing and enriching {len(leads)} leads...")
    enriched_leads = []
    
    for i, lead in enumerate(leads):
        logger.info(f"Processing lead {i+1}/{len(leads)}: {lead.get('company_name', 'Unknown')}")
        
        try:
            # Enrich About section if needed
            if lead.get("About", "") in ["-", "", None] or len(lead.get("About", "")) < 100:
                lead["About"] = enrich_about_section(openai_client, lead)
            
            # Determine AI readiness
            lead["ai_readiness"] = analyze_ai_readiness(openai_client, lead.get("About", ""), lead.get("Industry", ""))
            
            # Determine if SME
            lead["is_sme"] = determine_is_sme(lead.get("Company size", ""))
            
            # Add to enriched leads
            enriched_leads.append(lead)
            
        except Exception as e:
            logger.error(f"Error processing lead: {str(e)}")
            # Still add the lead, but without enrichment
            enriched_leads.append(lead)
    
    logger.info(f"Successfully processed {len(enriched_leads)} leads")
    return enriched_leads

def store_leads(supabase_client, leads):
    """Store leads in Supabase"""
    logger.info(f"Storing {len(leads)} leads in Supabase...")
    success_count = 0
    
    for i, lead in enumerate(leads):
        logger.info(f"Storing lead {i+1}/{len(leads)}: {lead.get('company_name', 'Unknown')}")
        
        try:
            # Convert company size to integer if possible
            company_size = lead.get('Company size', '')
            try:
                # Try to extract numeric value from company size
                size_match = re.search(r'\d+', str(company_size))
                if size_match:
                    employee_count = int(size_match.group())
                else:
                    employee_count = None
            except:
                employee_count = None
            
            # Prepare lead data for Supabase
            lead_data = {
                'company_name': lead.get('company_name', ''),
                'employee_count': employee_count,
                'is_sme': lead.get('is_sme', True),
                'about': lead.get('About', ''),
                'industry': lead.get('Industry', ''),
                'ai_readiness': lead.get('ai_readiness', 'AI Unaware'),
                'lead_source': 'LinkedIn',
                'status': 'new',
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'source_url': lead.get('source_url', '')
            }
            
            # Add email if website is available
            if lead.get('Website') and lead.get('Website') != '-':
                website = lead.get('Website', '')
                # Clean up website URL to extract domain
                domain = website.replace('http://', '').replace('https://', '').split('/')[0]
                lead_data['email'] = f"contact@{domain}"
            
            # Insert lead into Supabase
            logger.info(f"Inserting lead into Supabase: {lead_data['company_name']}")
            response = supabase_client.table('leads').insert(lead_data).execute()
            
            # Check if the insertion was successful
            if hasattr(response, 'error') and response.error:
                logger.error(f"Error inserting lead into Supabase: {response.error}")
            else:
                logger.info(f"Successfully inserted lead: {lead_data['company_name']}")
                success_count += 1
                
        except Exception as e:
            logger.error(f"Error storing lead in Supabase: {str(e)}")
    
    logger.info(f"Successfully stored {success_count} out of {len(leads)} leads in Supabase")
    return success_count

def main():
    """Main function to run the lead generation process"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Lead Generation System')
    parser.add_argument('--job-id', help='Job ID for tracking (default: auto-generated UUID)')
    parser.add_argument('--count', type=int, default=5, help='Number of leads to generate (default: 5)')
    parser.add_argument('--target-profile', default='{}', help='Target profile as JSON string (default: {})')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    parser.add_argument('--analyze-only', action='store_true', help='Only analyze existing leads, do not generate new ones')
    args = parser.parse_args()
    
    # Set logging level based on verbose flag
    if args.verbose:
        logging.getLogger('lead_generation').setLevel(logging.DEBUG)
    
    # Generate job ID if not provided
    job_id = args.job_id if args.job_id else str(uuid.uuid4())
    
    # Parse target profile
    try:
        target_profile = json.loads(args.target_profile)
    except json.JSONDecodeError:
        logger.error(f"Invalid target profile JSON: {args.target_profile}")
        sys.exit(1)
    
    logger.info(f"Starting lead generation process...")
    logger.info(f"Job ID: {job_id}")
    logger.info(f"Lead count: {args.count}")
    logger.info(f"Target profile: {json.dumps(target_profile)}")
    
    try:
        # Initialize API clients
        jigsawstack_client, openai_client, supabase_client = initialize_clients()
        
        # Create job record in Supabase
        update_job_status(supabase_client, job_id, 'created', 'Lead generation job created')
        
        # Update job status to processing
        update_job_status(supabase_client, job_id, 'processing', 'Lead generation started')
        
        # Step 1: Analyze existing leads to generate search parameters
        logger.info("Analyzing existing leads...")
        search_params = analyze_existing_leads(supabase_client, openai_client)
        logger.info(f"Search parameters: {search_params}")
        
        # If analyze-only flag is set, exit after analysis
        if args.analyze_only:
            logger.info("Analyze-only flag set, skipping lead generation")
            update_job_status(
                supabase_client, 
                job_id, 
                'complete', 
                'Lead analysis completed successfully'
            )
            return
        
        # Skip lead generation if count is 0
        if args.count <= 0:
            logger.info("Lead count is 0, skipping lead generation")
            update_job_status(
                supabase_client, 
                job_id, 
                'complete', 
                'Lead analysis completed successfully'
            )
            return
        
        # Step 2: Generate search queries based on search parameters
        logger.info(f"Generating search queries for {args.count} leads...")
        search_queries = generate_search_queries(openai_client, search_params, args.count)
        logger.info(f"Generated search queries: {search_queries}")
        
        # Step 3: Find LinkedIn URLs using JigsawStack
        logger.info("Finding LinkedIn company URLs...")
        linkedin_urls = find_linkedin_urls(jigsawstack_client, search_queries)
        logger.info(f"Found LinkedIn URLs: {linkedin_urls}")
        
        if not linkedin_urls:
            logger.warning("No LinkedIn URLs found. Updating job status and exiting.")
            update_job_status(
                supabase_client, 
                job_id, 
                'complete', 
                'No LinkedIn URLs found. Try different search queries.'
            )
            return
        
        # Step 4: Scrape data from LinkedIn profiles
        logger.info("Scraping LinkedIn profiles...")
        lead_data = scrape_linkedin_profiles(jigsawstack_client, linkedin_urls)
        logger.info(f"Scraped data for {len(lead_data)} profiles")
        
        if not lead_data:
            logger.warning("No lead data scraped. Updating job status and exiting.")
            update_job_status(
                supabase_client, 
                job_id, 
                'complete', 
                'No lead data could be scraped. Try different LinkedIn URLs.'
            )
            return
        
        # Step 5: Process and enrich lead data
        logger.info("Processing and enriching lead data...")
        enriched_leads = process_leads(openai_client, lead_data)
        logger.info(f"Processed and enriched {len(enriched_leads)} leads")
        
        # Step 6: Store in Supabase
        logger.info("Storing leads in Supabase...")
        success_count = store_leads(supabase_client, enriched_leads)
        
        # Update job status to complete
        logger.info(f"Updating job status to 'complete' for job {job_id}")
        update_job_status(
            supabase_client, 
            job_id, 
            'complete', 
            f'Successfully generated {success_count} leads'
        )
        logger.info("Lead generation process completed successfully")
        
    except Exception as e:
        logger.error(f"Error in lead generation: {str(e)}", exc_info=True)
        try:
            update_job_status(
                supabase_client,
                job_id,
                'error',
                f'Error generating leads: {str(e)}'
            )
        except Exception as update_error:
            logger.error(f"Error updating job status: {str(update_error)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
