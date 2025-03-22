const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Background processing function
const processInBackground = async (jobId, requestData, supabaseUrl, supabaseKey) => {
  try {
    console.log('Starting background processing for job:', jobId);
    
    // Initialize Supabase client
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not available for background processing');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Update job status to processing
    console.log('Updating job status to processing');
    await supabase
      .from('lead_generation_jobs')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
        message: 'Lead generation in progress'
      })
      .eq('job_id', jobId);
    
    // Try to execute Python script
    let pythonExecuted = false;
    
    // First, generate a simple lead with basic information
    try {
      console.log('Generating a test lead');
      const companyName = `Test Company ${Date.now().toString().slice(-4)}`;
      const website = `testcompany${Date.now().toString().slice(-4)}.com`;
      const email = `contact@${website}`;
      
      // Log Supabase connection details
      console.log('Supabase URL:', supabaseUrl);
      console.log('Supabase key length:', supabaseKey ? supabaseKey.length : 0);
      
      // Log table structure
      console.log('Checking table structure...');
      const { data: tableInfo, error: tableError } = await supabase
        .from('leads')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('Error checking table structure:', tableError);
      } else {
        console.log('Table structure sample:', tableInfo);
      }
      
      // Lead data for insertion with all required fields
      const leadDataToInsert = {
        company_name: companyName,
        email: email,
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lead_score: 75, // Adding a basic lead score
        is_sme: true, // Required field
        industry: 'Technology', // Optional but useful
        website: `https://${website}`,
        company_size: '10-50',
        founded: `${2010 + Math.floor(Math.random() * 13)}`, // 2010-2023
        ai_readiness_category: 'AI Aware',
        ai_readiness_score: '3.0',
        company_type: 'SME'
      };
      
      console.log('Lead data to insert:', leadDataToInsert);
      
      // Insert the lead into the database with simplified data
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert(leadDataToInsert);
      
      if (leadError) {
        console.error('Error inserting lead:', JSON.stringify(leadError));
      } else {
        console.log('Successfully inserted lead:', JSON.stringify(leadData || {}));
        
        // Update job status to indicate lead was generated
        const { error: updateError } = await supabase
          .from('lead_generation_jobs')
          .update({
            status: 'processing',
            message: 'Lead generated successfully, continuing processing'
          })
          .eq('job_id', jobId);
          
        if (updateError) {
          console.error('Error updating job status:', updateError);
        } else {
          console.log('Successfully updated job status');
        }
      }
    } catch (dbError) {
      console.error('Error generating lead:', dbError);
    }
    
    // Path to Python script
    const pythonScriptPath = path.join(__dirname, '..', 'generate-leads-background', 'python', 'main.py');
    console.log('Python script path:', pythonScriptPath);
    
    // Check if Python script exists
    if (fs.existsSync(pythonScriptPath)) {
      console.log('Python script exists at path');
      
      try {
        // Spawn Python process
        console.log('Spawning Python process...');
        const pythonProcess = spawn('python3', [
          pythonScriptPath,
          '--job-id', jobId,
          '--count', requestData.count || 1,
          '--target-profile', JSON.stringify(requestData.targetProfile || {})
        ]);
        
        // Log output for debugging
        pythonProcess.stdout.on('data', (data) => {
          console.log(`Python stdout: ${data}`);
        });
        
        pythonProcess.stderr.on('data', (data) => {
          console.error(`Python stderr: ${data}`);
        });
        
        // Wait for process to complete
        const exitCode = await new Promise((resolve) => {
          pythonProcess.on('close', (code) => {
            console.log(`Python process exited with code ${code}`);
            resolve(code);
          });
        });
        
        pythonExecuted = true;
        
        // Update job status based on exit code
        if (exitCode === 0) {
          console.log('Python script executed successfully');
          
          // Update job status to complete
          console.log('Updating job status to complete');
          const { error } = await supabase
            .from('lead_generation_jobs')
            .update({
              status: 'complete',
              updated_at: new Date().toISOString(),
              message: 'Lead generation completed successfully via Python script'
            })
            .eq('job_id', jobId);
            
          if (error) {
            console.error('Error updating job status:', error);
          } else {
            console.log('Job completed successfully:', jobId);
          }
        } else {
          console.error('Python script execution failed with code:', exitCode);
          
          // Update job status to error
          await supabase
            .from('lead_generation_jobs')
            .update({
              status: 'error',
              updated_at: new Date().toISOString(),
              message: `Python script execution failed with code: ${exitCode}`
            })
            .eq('job_id', jobId);
        }
      } catch (pythonError) {
        console.error('Error executing Python script:', pythonError);
        
        // Update job status to error
        await supabase
          .from('lead_generation_jobs')
          .update({
            status: 'error',
            updated_at: new Date().toISOString(),
            message: `Error executing Python script: ${pythonError.message}`
          })
          .eq('job_id', jobId);
      }
    } else {
      console.error('Python script does not exist at path');
    }
    
    // If Python wasn't executed, simulate processing
    if (!pythonExecuted) {
      console.log('Python script not executed, simulating processing...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Update job status to complete
      console.log('Updating job status to complete (simulated)');
      const { error } = await supabase
        .from('lead_generation_jobs')
        .update({
          status: 'complete',
          updated_at: new Date().toISOString(),
          message: 'Lead generation completed successfully (simulated)'
        })
        .eq('job_id', jobId);
        
      if (error) {
        console.error('Error updating job status:', error);
      } else {
        console.log('Job completed successfully (simulated):', jobId);
      }
    }
  } catch (error) {
    console.error('Background processing error:', error);
    
    // Update job with error status
    try {
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('lead_generation_jobs')
          .update({
            status: 'error',
            message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);
      }
    } catch (updateError) {
      console.error('Error updating job with error status:', updateError);
    }
  }
};

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
    
    // Generate a job ID
    const jobId = "test-" + Date.now();
    console.log('Generated job ID:', jobId);
    
    // Initialize Supabase client
    // Try both with and without VITE_ prefix
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Supabase key exists:', !!supabaseKey);
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase key length:', supabaseKey ? supabaseKey.length : 0);
    
    // Try to record job in database
    if (supabaseUrl && supabaseKey) {
      try {
        console.log('Initializing Supabase client');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        console.log('Recording job in database');
        const { data, error } = await supabase
          .from('lead_generation_jobs')
          .insert({
            job_id: jobId,
            status: 'pending',
            message: 'Lead generation job started',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error recording job:', error);
          // Continue with generated job ID
        } else {
          console.log('Job recorded in database:', jobId);
        }
      } catch (dbError) {
        console.error('Database connection error:', dbError);
        // Continue with generated job ID
      }
    } else {
      console.log('Supabase credentials not available, skipping database recording');
    }
    
    // Create response data
    const responseData = {
      message: "Lead generation started (simplified version)",
      jobId: jobId,
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
    
    // Start background processing without awaiting
    // This will continue running after the response is sent
    processInBackground(jobId, requestData, supabaseUrl, supabaseKey);
    
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
