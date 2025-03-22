const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors({
  origin: '*', // Update this with your frontend domain in production
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Endpoint to analyze existing leads
app.get('/api/analyze-leads', async (req, res) => {
  try {
    const jobId = `analyze-${uuidv4()}`;
    console.log(`Starting lead analysis job ${jobId}`);
    
    // Create log file for this job
    const logFile = path.join(logsDir, `${jobId}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // Spawn the Python script as a child process
    const pythonProcess = spawn('python', [
      path.join(__dirname, 'lead_generator.py'),
      '--job-id', jobId,
      '--count', '0',  // No leads to generate, just analyze
      '--analyze-only', 'true'
    ]);
    
    let output = '';
    
    // Log output for debugging
    pythonProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      console.log(`[${jobId}] stdout: ${dataStr}`);
      logStream.write(`[STDOUT] ${dataStr}\n`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      console.error(`[${jobId}] stderr: ${dataStr}`);
      logStream.write(`[STDERR] ${dataStr}\n`);
    });
    
    // Wait for process to complete
    await new Promise((resolve) => {
      pythonProcess.on('close', (code) => {
        console.log(`[${jobId}] Process exited with code ${code}`);
        logStream.write(`[INFO] Process exited with code ${code}\n`);
        logStream.end();
        resolve();
      });
    });
    
    // Try to extract analysis results from output
    try {
      const analysisMatch = output.match(/Search parameters: ({.*})/);
      if (analysisMatch && analysisMatch[1]) {
        const analysisResults = JSON.parse(analysisMatch[1]);
        res.json({ 
          success: true, 
          results: analysisResults
        });
      } else {
        res.json({ 
          success: false, 
          message: 'Could not extract analysis results'
        });
      }
    } catch (error) {
      res.json({ 
        success: false, 
        message: `Error parsing analysis results: ${error.message}`
      });
    }
  } catch (error) {
    console.error(`Error analyzing leads:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Error analyzing leads: ${error.message}` 
    });
  }
});

// Endpoint to generate leads
app.post('/api/generate-leads', (req, res) => {
  const { count = 5, targetProfile = {} } = req.body;
  const jobId = uuidv4();
  
  console.log(`Starting lead generation job ${jobId} with count ${count}`);
  
  // Create log file for this job
  const logFile = path.join(logsDir, `${jobId}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // Prepare the target profile JSON string
  const targetProfileJson = JSON.stringify(targetProfile);
  
  // Spawn the Python script as a child process
  const pythonProcess = spawn('python', [
    path.join(__dirname, 'lead_generator.py'),
    '--job-id', jobId,
    '--count', count.toString(),
    '--target-profile', targetProfileJson,
    '--verbose'
  ]);
  
  // Log output for debugging
  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[${jobId}] stdout: ${output}`);
    logStream.write(`[STDOUT] ${output}\n`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error(`[${jobId}] stderr: ${output}`);
    logStream.write(`[STDERR] ${output}\n`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`[${jobId}] Process exited with code ${code}`);
    logStream.write(`[INFO] Process exited with code ${code}\n`);
    logStream.end();
  });
  
  // Return the job ID immediately
  res.json({ 
    success: true, 
    jobId,
    message: 'Lead generation job started'
  });
});

// Endpoint to check job status
app.get('/api/check-status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    // This would typically query Supabase for the job status
    // For now, we'll just check if the log file exists
    const logFile = path.join(logsDir, `${jobId}.log`);
    
    if (fs.existsSync(logFile)) {
      // Read the last few lines of the log file to get the latest status
      const logContent = fs.readFileSync(logFile, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      const lastLine = lines[lines.length - 1] || '';
      
      if (lastLine.includes('Process exited with code 0')) {
        res.json({ status: 'complete', message: 'Lead generation completed successfully' });
      } else if (lastLine.includes('Process exited with code')) {
        res.json({ status: 'error', message: 'Lead generation failed' });
      } else {
        res.json({ status: 'processing', message: 'Lead generation in progress' });
      }
    } else {
      res.status(404).json({ 
        status: 'not_found', 
        message: `No job found with ID: ${jobId}` 
      });
    }
  } catch (error) {
    console.error(`Error checking status for job ${jobId}:`, error);
    res.status(500).json({ 
      status: 'error', 
      message: `Error checking job status: ${error.message}` 
    });
  }
});

// Endpoint to get job logs
app.get('/api/logs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const logFile = path.join(logsDir, `${jobId}.log`);
    
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf8');
      res.json({ logs: logContent });
    } else {
      res.status(404).json({ 
        status: 'not_found', 
        message: `No logs found for job ID: ${jobId}` 
      });
    }
  } catch (error) {
    console.error(`Error getting logs for job ${jobId}:`, error);
    res.status(500).json({ 
      status: 'error', 
      message: `Error getting job logs: ${error.message}` 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  POST /api/generate-leads - Start lead generation`);
  console.log(`  GET /api/check-status/:jobId - Check job status`);
  console.log(`  GET /api/logs/:jobId - Get job logs`);
});
