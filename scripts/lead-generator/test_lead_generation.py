#!/usr/bin/env python3
"""
Test script to verify the full lead generation process with a minimal example.
"""

import os
import sys
import json
import uuid
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def run_lead_generation_test():
    """Run a minimal lead generation test"""
    print("Running lead generation test...")
    
    # Generate a unique job ID for this test
    job_id = str(uuid.uuid4())
    print(f"Test job ID: {job_id}")
    
    # Set a minimal count to speed up the test
    count = 1
    print(f"Lead count: {count}")
    
    # Set a specific target profile for testing
    target_profile = {
        "employeeCount": "50-200",
        "preferredType": "Technology"
    }
    print(f"Target profile: {json.dumps(target_profile)}")
    
    # Build the command to run the lead generator script
    # Properly escape the JSON string for command line
    target_profile_json = json.dumps(target_profile).replace('"', '\\"')
    cmd = f'python lead_generator.py --job-id {job_id} --count {count} --target-profile "{target_profile_json}" --verbose'
    print(f"Running command: {cmd}")
    
    # Execute the command
    print("\n" + "=" * 50)
    print("LEAD GENERATION OUTPUT")
    print("=" * 50 + "\n")
    
    exit_code = os.system(cmd)
    
    print("\n" + "=" * 50)
    print(f"LEAD GENERATION COMPLETED WITH EXIT CODE: {exit_code}")
    print("=" * 50 + "\n")
    
    if exit_code == 0:
        print("Lead generation test completed successfully!")
    else:
        print(f"Lead generation test failed with exit code {exit_code}")
    
    return exit_code == 0

if __name__ == "__main__":
    success = run_lead_generation_test()
    sys.exit(0 if success else 1)
