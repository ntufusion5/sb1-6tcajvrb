#!/bin/bash
# Run all tests in sequence

echo "===== Lead Generation System Tests ====="
echo

# Change to the script directory
cd "$(dirname "$0")"

# Test Supabase connection
echo "===== Testing Supabase Connection ====="
python test_supabase.py
if [ $? -ne 0 ]; then
    echo "Supabase connection test failed!"
    exit 1
fi
echo

# Test API connections
echo "===== Testing API Connections ====="
python test_apis.py
if [ $? -ne 0 ]; then
    echo "API connections test failed!"
    exit 1
fi
echo

# Run minimal lead generation test
echo "===== Running Lead Generation Test ====="
python test_lead_generation.py
if [ $? -ne 0 ]; then
    echo "Lead generation test failed!"
    exit 1
fi
echo

echo "===== All Tests Passed! ====="
echo "The lead generation system is ready to use."
echo
echo "To run the lead generator directly:"
echo "  python lead_generator.py --count 5 --target-profile '{\"employeeCount\": \"50-200\"}'"
echo
echo "To start the API server:"
echo "  npm start"
echo
