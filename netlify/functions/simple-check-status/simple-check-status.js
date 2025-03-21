// Simple job status checker for testing
exports.handler = async function(event, context) {
  console.log("Simple check status function called");
  
  // Get job ID from query parameters
  const jobId = event.queryStringParameters?.jobId;
  
  if (!jobId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Job ID is required' })
    };
  }
  
  console.log("Checking status for job:", jobId);
  
  // For testing, determine status based on job ID
  // In a real implementation, this would check a database
  let status, message;
  
  // If job ID contains "error", simulate an error
  if (jobId.includes("error")) {
    status = "error";
    message = "Simulated error for testing";
  } 
  // If job ID is from more than 30 seconds ago, consider it complete
  else if (jobId.startsWith("test-") && parseInt(jobId.substring(5)) < Date.now() - 30000) {
    status = "complete";
    message = "Lead generation completed successfully";
  } 
  // Otherwise, it's still processing
  else {
    status = "processing";
    message = "Lead generation in progress";
  }
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      job_id: jobId,
      status: status,
      message: message,
      created_at: new Date(parseInt(jobId.substring(5))).toISOString(),
      updated_at: new Date().toISOString()
    })
  };
};
