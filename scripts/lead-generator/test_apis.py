#!/usr/bin/env python3
"""
Test script to verify JigsawStack and OpenAI API connections.
"""

import os
from dotenv import load_dotenv
from jigsawstack import JigsawStack
import openai

# Load environment variables from .env file
load_dotenv()

def test_jigsawstack_connection():
    """Test connection to JigsawStack API"""
    print("Testing JigsawStack API connection...")
    
    # Get JigsawStack API key from environment variables
    jigsawstack_api_key = os.environ.get('JIGSAWSTACK_API_KEY')
    
    if not jigsawstack_api_key:
        print("Error: JIGSAWSTACK_API_KEY environment variable is not set")
        return False
    
    print(f"JIGSAWSTACK_API_KEY: {'*' * 10 + jigsawstack_api_key[-5:]}")
    
    try:
        # Initialize JigsawStack client
        jigsawstack_client = JigsawStack(api_key=jigsawstack_api_key)
        print("JigsawStack client initialized successfully")
        
        # Test connection by performing a simple search
        print("\nTesting JigsawStack search API...")
        search_params = {
            "query": "test search",
            "ai_overview": True,
            "safe_search": "moderate",
            "spell_check": True
        }
        
        search_results = jigsawstack_client.web.search(search_params)
        results = search_results.json().get("results", [])
        
        if results is not None:
            print(f"Successfully performed search. Found {len(results)} results.")
            if results:
                print(f"First result title: {results[0].get('title', 'No title')}")
                print(f"First result URL: {results[0].get('url', 'No URL')}")
        else:
            print("Error: Failed to perform search")
            return False
        
        print("\nJigsawStack API test passed!")
        return True
        
    except Exception as e:
        print(f"Error connecting to JigsawStack API: {str(e)}")
        return False

def test_openai_connection():
    """Test connection to OpenAI API"""
    print("\nTesting OpenAI API connection...")
    
    # Get OpenAI API key from environment variables
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    
    if not openai_api_key:
        print("Error: OPENAI_API_KEY environment variable is not set")
        return False
    
    print(f"OPENAI_API_KEY: {'*' * 10 + openai_api_key[-5:]}")
    
    try:
        # Initialize OpenAI client
        openai_client = openai.Client(api_key=openai_api_key)
        print("OpenAI client initialized successfully")
        
        # Test connection by generating a simple completion
        print("\nTesting OpenAI chat completion API...")
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Say hello in one word."}],
            temperature=0.7,
            max_tokens=10
        )
        
        if response and response.choices:
            print(f"Successfully generated completion.")
            print(f"Response: {response.choices[0].message.content}")
        else:
            print("Error: Failed to generate completion")
            return False
        
        print("\nOpenAI API test passed!")
        return True
        
    except Exception as e:
        print(f"Error connecting to OpenAI API: {str(e)}")
        return False

if __name__ == "__main__":
    jigsawstack_success = test_jigsawstack_connection()
    openai_success = test_openai_connection()
    
    if jigsawstack_success and openai_success:
        print("\nAll API tests passed!")
    else:
        print("\nSome API tests failed. Please check the error messages above.")
