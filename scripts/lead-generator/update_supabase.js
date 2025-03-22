// Script to update Supabase tables
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables are not set');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'update_supabase_tables.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Split the SQL content into individual statements
const statements = sqlContent
  .split(';')
  .map(statement => statement.trim())
  .filter(statement => statement.length > 0);

// Execute each SQL statement
async function executeStatements() {
  console.log('Updating Supabase tables...');
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}:`);
    console.log(statement);
    
    try {
      const { data, error } = await supabase.rpc('pgSQL', { query: statement });
      
      if (error) {
        console.error(`Error executing statement: ${error.message}`);
      } else {
        console.log('Statement executed successfully');
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
    
    console.log('---');
  }
  
  console.log('Supabase tables update completed');
}

executeStatements().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
