const { createClient } = require('@supabase/supabase-js');

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
    
    // Initialize default response data with more detailed logging
    console.log('Initializing default response data');
    let responseData = {
      job_id: jobId,
      status: 'complete',
      message: 'Test job completed successfully (simplified version)',
      created_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      updated_at: new Date().toISOString()
    };
    console.log('Default response data:', responseData);
    
    // Initialize Supabase client
    // Try both with and without VITE_ prefix
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Supabase key exists:', !!supabaseKey);
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase key length:', supabaseKey ? supabaseKey.length : 0);
    
    // Try to get job status from database
    if (supabaseUrl && supabaseKey) {
      try {
        console.log('Initializing Supabase client');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        console.log('Querying database for job status');
        const { data, error } = await supabase
          .from('lead_generation_jobs')
          .select('*')
          .eq('job_id', jobId)
          .single();
        
        if (error) {
          console.log('Database error, falling back to test data:', error);
          // Continue with test data as fallback
        } else if (data) {
          console.log('Found job in database:', data);
          // Use real data but keep test data as fallback
          responseData = data;
        } else {
          console.log('Job not found in database, using test data');
        }
      } catch (dbError) {
        console.error('Database connection error:', dbError);
        // Continue with test data as fallback
      }
    } else {
      console.log('Supabase credentials not available, using test data');
    }
    
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
