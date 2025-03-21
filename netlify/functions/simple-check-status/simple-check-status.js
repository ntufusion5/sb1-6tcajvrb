exports.handler = async function(event, context) {
  // Log request details
  console.log('Function invoked with method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers));
  console.log('Query parameters:', JSON.stringify(event.queryStringParameters));
  
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
    // Get job ID from query parameters
    const jobId = event.queryStringParameters?.jobId;
    console.log('Checking status for job ID:', jobId);
    
    if (!jobId) {
      console.error('No job ID provided');
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
    
    // Create a simple response
    const responseData = {
      job_id: jobId,
      status: 'complete',
      message: 'Test job completed successfully (simplified version)',
      created_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      updated_at: new Date().toISOString(),
      leads_generated: 1
    };
    
    // Log the response we're about to send
    console.log('Sending response:', responseData);
    
    // Stringify the response
    const responseBody = JSON.stringify(responseData);
    
    // Return the response
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: responseBody
    };
    
    console.log('Final response object:', JSON.stringify(response));
    return response;
  } catch (error) {
    console.error('Error in simple-check-status:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
