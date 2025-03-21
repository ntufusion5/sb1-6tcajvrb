// Simple generate leads function for testing
exports.handler = async function(event, context) {
  console.log("Simple generate leads function called");
  
  // Generate a unique job ID
  const jobId = "test-" + Date.now();
  
  // Log the request body for debugging
  try {
    const body = JSON.parse(event.body || '{}');
    console.log("Request body:", body);
  } catch (error) {
    console.error("Error parsing request body:", error);
  }
  
  // Return a simple response with the job ID
  return {
    statusCode: 202,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      message: "Lead generation started (simplified test version)",
      jobId: jobId,
      timestamp: new Date().toISOString()
    })
  };
};
