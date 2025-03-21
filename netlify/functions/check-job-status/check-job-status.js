const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  console.log('check-job-status function called with event:', JSON.stringify(event));
  
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
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Supabase key exists:', !!supabaseKey);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Query job status
    console.log('Querying Supabase for job status...');
    const { data, error } = await supabase
      .from('lead_generation_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();
    
    if (error) {
      console.error('Supabase query error:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: error.message })
      };
    }
    
    if (!data) {
      console.log('Job not found in database');
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'Job not found' })
      };
    }
    
    console.log('Job status found:', data);
    
    // For testing, return a simplified response
    const testData = {
      job_id: jobId,
      status: 'complete',
      message: 'Test job completed successfully',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Stringify the data
    const responseBody = JSON.stringify(testData);
    console.log('Response body:', responseBody);
    
    // Create the response object
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
    
    // Check for empty response body
    if (!response.body || response.body.trim() === '') {
      console.error('Empty response body detected');
      response.body = JSON.stringify({ 
        error: "Empty response body",
        message: "The response body is empty or undefined"
      });
    }
    
    console.log('Returning response:', JSON.stringify(response));
    return response;
  } catch (error) {
    console.error('Unexpected error in check-job-status:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
  }
};
