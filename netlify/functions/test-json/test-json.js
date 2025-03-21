exports.handler = async function() {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({ 
      message: "Test JSON response",
      timestamp: new Date().toISOString()
    })
  };
};
