exports.handler = async function(event, context) {
  // Log request details
  console.log('Function invoked with method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers));
  console.log('Body:', event.body);
  
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
    // Parse the request body if it exists
    let requestData = {};
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
        console.log('Parsed request data:', requestData);
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
      }
    }
    
    // Create a simple response
    const responseData = {
      message: "Lead generation started (simplified version)",
      jobId: "test-" + Date.now(),
      timestamp: new Date().toISOString(),
      receivedData: requestData
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: responseBody
    };
    
    console.log('Final response object:', JSON.stringify(response));
    return response;
  } catch (error) {
    console.error('Error in simple-generate-leads:', error);
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
