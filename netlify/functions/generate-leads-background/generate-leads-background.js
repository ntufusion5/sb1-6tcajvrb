const { spawn } = require('child_process');
const path = require('path');

exports.handler = async function(event, context) {
  // Return immediately while processing continues in background
  const response = {
    statusCode: 202,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({ 
      message: "Lead generation started in background",
      jobId: context.awsRequestId // Use as a job ID for status checking
    })
  };
  
  // Don't wait for this to complete
  processInBackground(event, context);
  
  return response;
};

async function processInBackground(event, context) {
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    
    // Path to Python script
    const pythonScriptPath = path.join(__dirname, 'python', 'main.py');
    
    // Spawn Python process
    const pythonProcess = spawn('python3', [
      pythonScriptPath,
      '--job-id', context.awsRequestId,
      '--count', body.count || 5,
      '--target-profile', JSON.stringify(body.targetProfile || {})
    ]);
    
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
  } catch (error) {
    console.error('Background processing error:', error);
  }
}
