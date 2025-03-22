# PowerShell script to run all tests in sequence

Write-Host "===== Lead Generation System Tests =====" -ForegroundColor Cyan
Write-Host

# Change to the script directory
Set-Location -Path $PSScriptRoot

# Test Supabase connection
Write-Host "===== Testing Supabase Connection =====" -ForegroundColor Cyan
python test_supabase.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "Supabase connection test failed!" -ForegroundColor Red
    exit 1
}
Write-Host

# Test API connections
Write-Host "===== Testing API Connections =====" -ForegroundColor Cyan
python test_apis.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "API connections test failed!" -ForegroundColor Red
    exit 1
}
Write-Host

# Run minimal lead generation test
Write-Host "===== Running Lead Generation Test =====" -ForegroundColor Cyan
python test_lead_generation.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lead generation test failed!" -ForegroundColor Red
    exit 1
}
Write-Host

Write-Host "===== All Tests Passed! =====" -ForegroundColor Green
Write-Host "The lead generation system is ready to use." -ForegroundColor Green
Write-Host
Write-Host "To run the lead generator directly:" -ForegroundColor Yellow
Write-Host "  python lead_generator.py --count 5 --target-profile '{\"employeeCount\": \"50-200\"}'" -ForegroundColor Yellow
Write-Host
Write-Host "To start the API server:" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor Yellow
Write-Host
