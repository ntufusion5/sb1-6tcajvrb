#!/usr/bin/env python3
"""
Test script to verify Supabase connection and table structure.
"""

import os
import json
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from .env file
load_dotenv()

def test_supabase_connection():
    """Test connection to Supabase"""
    print("Testing Supabase connection...")
    
    # Get Supabase credentials from environment variables
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables are not set")
        return False
    
    print(f"SUPABASE_URL: {supabase_url}")
    print(f"SUPABASE_SERVICE_KEY: {'*' * 10 + supabase_key[-5:]}")
    
    try:
        # Initialize Supabase client
        supabase = create_client(supabase_url, supabase_key)
        print("Supabase client initialized successfully")
        
        # Test connection by querying the leads table
        print("\nTesting leads table...")
        response = supabase.table('leads').select('*').limit(1).execute()
        leads_data = response.data
        
        if leads_data is not None:
            print(f"Successfully queried leads table. Found {len(leads_data)} records.")
            if leads_data:
                print("Sample lead record:")
                print(json.dumps(leads_data[0], indent=2))
            else:
                print("No records found in leads table.")
        else:
            print("Error: Failed to query leads table")
            return False
        
        # Test connection by querying the lead_generation_jobs table
        print("\nTesting lead_generation_jobs table...")
        response = supabase.table('lead_generation_jobs').select('*').limit(1).execute()
        jobs_data = response.data
        
        if jobs_data is not None:
            print(f"Successfully queried lead_generation_jobs table. Found {len(jobs_data)} records.")
            if jobs_data:
                print("Sample job record:")
                print(json.dumps(jobs_data[0], indent=2))
            else:
                print("No records found in lead_generation_jobs table.")
        else:
            print("Error: Failed to query lead_generation_jobs table")
            return False
        
        print("\nAll Supabase tests passed!")
        return True
        
    except Exception as e:
        print(f"Error connecting to Supabase: {str(e)}")
        return False

if __name__ == "__main__":
    test_supabase_connection()
