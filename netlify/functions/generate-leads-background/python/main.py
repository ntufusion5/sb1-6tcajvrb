import argparse
import json
import os
import sys
import time
import logging
from jigsawstack import JigsawStack
import openai
from supabase import create_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('lead_generation')

def main():
    logger.info("Starting lead generation process...")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('--job-id', required=True)
    parser.add_argument('--count', type=int, default=5)
    parser.add_argument('--target-profile', default='{}')
    args = parser.parse_args()
    
    logger.info(f"Arguments: job_id={args.job_id}, count={args.count}, target_profile={args.target_profile}")
    
    # Parse target profile
    target_profile = json.loads(args.target_profile)
    
    # Check environment variables
    logger.info("Checking environment variables...")
    logger.info(f"JIGSAWSTACK_API_KEY exists: {bool(os.environ.get('JIGSAWSTACK_API_KEY'))}")
    logger.info(f"OPENAI_API_KEY exists: {bool(os.environ.get('OPENAI_API_KEY'))}")
    logger.info(f"SUPABASE_URL exists: {bool(os.environ.get('SUPABASE_URL'))}")
    logger.info(f"SUPABASE_ANON_KEY exists: {bool(os.environ.get('SUPABASE_ANON_KEY'))}")
    
    # Initialize clients
    logger.info("Initializing API clients...")
    try:
        jigsawstack_client = JigsawStack(
            api_key=os.environ.get('JIGSAWSTACK_API_KEY')
        )
        logger.info("JigsawStack client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize JigsawStack client: {str(e)}")
        raise
    
    try:
        openai_client = openai.Client(
            api_key=os.environ.get('OPENAI_API_KEY')
        )
        logger.info("OpenAI client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {str(e)}")
        raise
    
    try:
        supabase_client = create_client(
            os.environ.get('SUPABASE_URL'),
            os.environ.get('SUPABASE_ANON_KEY')
        )
        logger.info("Supabase client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise
    
    # Update job status
    logger.info(f"Updating job status to 'processing' for job {args.job_id}")
    update_job_status(supabase_client, args.job_id, 'processing', 'Lead generation started')
    
    try:
        # Step 1: Generate search queries based on target profile
        logger.info(f"Generating search queries for {args.count} leads...")
        search_queries = generate_search_queries(openai_client, target_profile, args.count)
        logger.info(f"Generated search queries: {search_queries}")
        
        # Step 2: Find LinkedIn URLs using JigsawStack
        logger.info("Finding LinkedIn company URLs...")
        linkedin_urls = find_linkedin_urls(jigsawstack_client, search_queries)
        logger.info(f"Found LinkedIn URLs: {linkedin_urls}")
        
        # Step 3: Scrape data from LinkedIn profiles
        logger.info("Scraping LinkedIn profiles...")
        lead_data = scrape_linkedin_profiles(jigsawstack_client, linkedin_urls)
        logger.info(f"Scraped data for {len(lead_data)} profiles")
        
        # Step 4: Analyze data with OpenAI
        logger.info("Analyzing company data with OpenAI...")
        enriched_leads = analyze_company_data(openai_client, lead_data)
        logger.info(f"Analyzed and enriched {len(enriched_leads)} leads")
        
        # Step 5: Store in Supabase
        logger.info("Storing leads in Supabase...")
        store_leads(supabase_client, enriched_leads)
        
        # Update job status to complete
        logger.info(f"Updating job status to 'complete' for job {args.job_id}")
        update_job_status(
            supabase_client, 
            args.job_id, 
            'complete', 
            f'Successfully generated {len(enriched_leads)} leads'
        )
        logger.info("Lead generation process completed successfully")
        
    except Exception as e:
        logger.error(f"Error in lead generation: {str(e)}", exc_info=True)
        update_job_status(
            supabase_client,
            args.job_id,
            'error',
            f'Error generating leads: {str(e)}'
        )

def update_job_status(supabase_client, job_id, status, message):
    """Update job status in Supabase"""
    try:
        supabase_client.table('lead_generation_jobs').upsert({
            'job_id': job_id,
            'status': status,
            'message': message,
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ')
        }).execute()
    except Exception as e:
        print(f"Error updating job status: {str(e)}")

def generate_search_queries(openai_client, target_profile, count):
    """Generate search queries for finding companies based on target profile"""
    prompt = f"""
    Generate {count} search queries to find LinkedIn company profiles for businesses with the following characteristics:
    - Employee count: {target_profile.get('employeeCount', '10-50')}
    - Annual revenue: {target_profile.get('annualRevenue', '10000000-20000000')}
    - Preferred type: {target_profile.get('preferredType', 'SME')}
    
    The queries should be diverse and target different industries and locations.
    Return the queries as a JSON array of strings.
    """
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500
        )
        
        content = response.choices[0].message.content
        
        # Try to extract JSON array from the response
        try:
            # Look for JSON array in the response
            import re
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                queries = json.loads(json_match.group(0))
            else:
                # Fallback: split by newlines and clean up
                queries = [line.strip().strip('"-,') for line in content.split('\n') 
                          if line.strip() and not line.strip().startswith('{') and not line.strip().startswith('}')]
        except:
            # If JSON parsing fails, use a simple fallback
            queries = [
                f"SME companies with 10-50 employees",
                f"Small businesses with revenue 10-20 million",
                f"Medium-sized enterprises in technology",
                f"Growing companies with 10-50 team members",
                f"Successful small businesses"
            ]
            
        # Ensure we have the requested number of queries
        while len(queries) < count:
            queries.append(f"SME business {len(queries) + 1}")
            
        return queries[:count]  # Return only the requested number of queries
        
    except Exception as e:
        print(f"Error generating search queries: {str(e)}")
        # Fallback queries
        return [
            f"SME companies with 10-50 employees",
            f"Small businesses with revenue 10-20 million",
            f"Medium-sized enterprises in technology",
            f"Growing companies with 10-50 team members",
            f"Successful small businesses"
        ][:count]

def find_linkedin_urls(jigsawstack_client, search_queries):
    """Find LinkedIn URLs for the given search queries"""
    linkedin_urls = []
    
    for query in search_queries:
        # Add a small delay between requests to avoid rate limiting
        time.sleep(1)
        
        try:
            # Search for LinkedIn company URL
            search_params = {
                "query": f"{query} company linkedin",
                "ai_overview": True,
                "safe_search": "moderate",
                "spell_check": True
            }
            
            search_results = jigsawstack_client.web.search(search_params)
            results = search_results.json().get("results", [])
            
            # Extract LinkedIn URLs from search results
            for result in results:
                url = result.get("url", "")
                if "linkedin.com/company/" in url:
                    linkedin_urls.append(url)
                    break  # Take the first LinkedIn URL for each query
        except Exception as e:
            print(f"Error searching for {query}: {str(e)}")
    
    return linkedin_urls

def scrape_linkedin_profiles(jigsawstack_client, linkedin_urls):
    """Scrape data from LinkedIn profiles"""
    lead_data = []
    
    for url in linkedin_urls:
        # Add a small delay between requests to avoid rate limiting
        time.sleep(2)
        
        try:
            # Scrape LinkedIn profile
            scrape_params = {
                "url": url,
                "element_prompts": ["Company size", "Founded", "Industry", "Website", "About"]
            }
            
            result = jigsawstack_client.web.ai_scrape(scrape_params)
            data = result.json().get("context", {})
            
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
            
            lead_data.append(data)
            
        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
    
    return lead_data

def analyze_company_data(openai_client, lead_data):
    """Analyze company data to determine AI readiness and company type"""
    enriched_leads = []
    
    for lead in lead_data:
        try:
            # Analyze AI readiness
            ai_readiness_result = get_ai_readiness(openai_client, lead.get("About", ""), lead.get("Website", ""))
            
            # Parse AI Readiness response
            ai_score = "1"
            ai_category = "AI Unaware"
            
            lines = ai_readiness_result.split("\n")
            for line in lines:
                if "AI Readiness Score:" in line:
                    ai_score = line.split(":")[1].strip()
                elif "AI Readiness Category:" in line:
                    ai_category = line.split(":")[1].strip()
            
            # Analyze company type
            company_type_result = classify_company_type(openai_client, lead.get("About", ""), lead.get("Website", ""))
            
            # Parse Company Type response
            company_type = "SME"
            
            lines = company_type_result.split("\n")
            for line in lines:
                if "Company Type:" in line:
                    company_type = line.split(":")[1].strip()
            
            # Add analysis results to lead data
            lead["ai_readiness_score"] = ai_score
            lead["ai_readiness_category"] = ai_category
            lead["company_type"] = company_type
            
            # Add to enriched leads
            enriched_leads.append(lead)
            
        except Exception as e:
            print(f"Error analyzing lead: {str(e)}")
            # Still add the lead, but without enrichment
            enriched_leads.append(lead)
    
    return enriched_leads

def get_ai_readiness(openai_client, about_text, website):
    """Determine AI readiness score and category"""
    prompt = f"""
    Based on the AI Readiness Index:
    - AI Unaware (Score < 2.5): Unaware of AI applications.
    - AI Aware (2.5 - 3.4): Aware but limited use cases.
    - AI Ready (3.5 - 4.5): Can integrate AI into processes.
    - AI Competent (> 4.5): Develops custom AI solutions.
    
    Given the following company information:
    - Company Description: "{about_text}"
    - Website: "{website}"
    
    Analyze the AI readiness based on both the company description and website.
    If no AI usage is detected, return:
    AI Readiness Score: 1
    AI Readiness Category: AI Unaware
    
    Provide a structured response in this format:
    AI Readiness Score: <score>
    AI Readiness Category: <category>
    """
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=150
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error getting AI readiness: {str(e)}")
        return "AI Readiness Score: 1\nAI Readiness Category: AI Unaware"

def classify_company_type(openai_client, about_text, website):
    """Classify company as SME, Startup, or MNC"""
    prompt = f"""
    Based on the company information below, classify whether the company is a:
    - SME (Small and Medium Enterprise)
    - Startup
    - MNC (Multinational Corporation)
    
    Company Description: "{about_text}"
    Website: "{website}"
    
    Analyze the company's business scope and website domain to classify it.
    Provide a structured response in this format:
    Company Type: <SME/Startup/MNC>
    """
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=100
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error classifying company type: {str(e)}")
        return "Company Type: SME"

def store_leads(supabase_client, leads):
    """Store leads in Supabase"""
    for lead in leads:
        try:
            # Prepare lead data for Supabase
            lead_data = {
                'company_name': lead.get('company_name', ''),
                'company_size': lead.get('Company size', ''),
                'founded': lead.get('Founded', ''),
                'industry': lead.get('Industry', ''),
                'website': lead.get('Website', ''),
                'about': lead.get('About', ''),
                'source_url': lead.get('source_url', ''),
                'ai_readiness_score': lead.get('ai_readiness_score', ''),
                'ai_readiness_category': lead.get('ai_readiness_category', ''),
                'company_type': lead.get('company_type', ''),
                'status': 'new',
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'email': f"contact@{lead.get('Website', '').replace('http://', '').replace('https://', '').split('/')[0]}"
            }
            
            # Insert lead into Supabase
            response = supabase_client.table('leads').insert(lead_data).execute()
            
            # Check if the insertion was successful
            if hasattr(response, 'error') and response.error:
                print(f"Error inserting lead into Supabase: {response.error}")
            else:
                print(f"Successfully inserted lead: {lead_data['company_name']}")
                
        except Exception as e:
            print(f"Error storing lead in Supabase: {str(e)}")

if __name__ == "__main__":
    main()
