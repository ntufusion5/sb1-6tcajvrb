const { spawn } = require('child_process');
const path = require('path');

exports.handler = async function(event, context) {
  console.log('Function invoked with event:', JSON.stringify(event));
  console.log('Context:', JSON.stringify(context));
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }
  
  try {
    // Return immediately while processing continues in background
    const response = {
      statusCode: 202,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        message: "Lead generation started in background",
        jobId: context.awsRequestId // Use as a job ID for status checking
      })
    };
    
    console.log('Returning response:', JSON.stringify(response));
    
    // Don't wait for this to complete
    processInBackground(event, context);
    
    return response;
  } catch (error) {
    console.error('Error in generate-leads-background:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: "Internal server error",
        message: error.message,
        stack: error.stack
      })
    };
  }
};

async function processInBackground(event, context) {
  try {
    console.log('Starting background process...');
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    console.log('Request body:', JSON.stringify(body));
    
    // Check environment variables
    console.log('Environment variables check:');
    console.log('JIGSAWSTACK_API_KEY exists:', !!process.env.JIGSAWSTACK_API_KEY);
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
    
    // Path to Python script
    const pythonScriptPath = path.join(__dirname, 'python', 'main.py');
    console.log('Python script path:', pythonScriptPath);
    
    // Check if Python script exists
    const fs = require('fs');
    if (fs.existsSync(pythonScriptPath)) {
      console.log('Python script exists at path');
    } else {
      console.error('Python script does not exist at path');
    }
    
    // Spawn Python process
    console.log('Spawning Python process...');
    const pythonProcess = spawn('python3', [
      pythonScriptPath,
      '--job-id', context.awsRequestId,
      '--count', body.count || 5,
      '--target-profile', JSON.stringify(body.targetProfile || {})
    ]);
    
    console.log('Python process spawned with command:');
    console.log('python3', [
      pythonScriptPath,
      '--job-id', context.awsRequestId,
      '--count', body.count || 5,
      '--target-profile', JSON.stringify(body.targetProfile || {})
    ].join(' '));
    
    // Log output for debugging
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python stdout: ${data}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });
    
    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
    });
  } catch (error) {
    console.error('Background processing error:', error);
  }
}
