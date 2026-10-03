const fs = require('fs');
// using native fetch
const { spawn } = require('child_process');

(async () => {
  // Login first
  const resLogin = await fetch('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'e2e_1784991898144@intellicore.ai', password: 'Password123!' }) // from previous user
  });
  
  let access_token = null;
  if (!resLogin.ok) {
      // create new user
      const testEmail = `pdf_test_${Date.now()}@intellicore.ai`;
      const resSignup = await fetch('http://127.0.0.1:8001/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'Password123!', full_name: 'PDF Tester' })
      });
      const dataSignup = await resSignup.json();
      
      const resLogin2 = await fetch('http://127.0.0.1:8001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testEmail, password: 'Password123!' })
      });
      const data2 = await resLogin2.json();
      access_token = data2.access_token;
  } else {
      const data = await resLogin.json();
      access_token = data.access_token;
  }
  
  const authHeaders = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };
  
  const resOrgs = await fetch(`http://127.0.0.1:8001/api/v1/organizations`, { headers: authHeaders });
  const orgs = await resOrgs.json();
  const orgId = orgs[0].id;

  const resWs = await fetch(`http://127.0.0.1:8001/api/v1/workspaces?organization_id=${orgId}`, { headers: authHeaders });
  const workspaces = await resWs.json();
  const wsId = workspaces[0].id;

  const resDepts = await fetch(`http://127.0.0.1:8001/api/v1/departments?workspace_id=${wsId}`, { headers: authHeaders });
  const departments = await resDepts.json();
  const deptId = departments[0].id;

  const resCreateCol = await fetch(`http://127.0.0.1:8001/api/v1/collections`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'PDF Testing', description: 'Testing PDF', department_id: deptId })
  });
  const colData = await resCreateCol.json();
  const colId = colData.id;

  console.log(`Created collection ${colId}. Uploading PDF...`);
  
  // Create dummy PDF
  const txtContent = "Hello World PDF! IntelliCore is a great AI platform that was built by Dhairya in a secret project.";
  const blob = new Blob([txtContent], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', blob, 'test.txt');
  
  const resDoc = await fetch(`http://127.0.0.1:8001/api/v1/documents/upload?collection_id=${colId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}` },
    body: formData
  });
  const docData = await resDoc.json();
  console.log('Upload response:', docData);
  
  const docId = docData.id;
  console.log(`Document ID: ${docId}. Waiting for processing...`);
  
  for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const resCheck = await fetch(`http://127.0.0.1:8001/api/v1/documents/${docId}`, { headers: authHeaders });
      const checkData = await resCheck.json();
      console.log(`Status at ${i * 2}s: ${checkData.status}`);
      if (checkData.status === 'completed') {
          console.log('✅ Success! Document processed and synced.');
          
          const resChunks = await fetch(`http://127.0.0.1:8001/api/v1/documents/${docId}/chunks`, { headers: authHeaders });
          const chunks = await resChunks.json();
          console.log(`Extracted chunks:`, chunks.length);
          
          console.log("Sending chat query...");
          const resChat = await fetch(`http://127.0.0.1:8001/api/v1/chat/query`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ query: 'what did the document say about Hello World?' })
          });
          const chatData = await resChat.json();
          console.log(`LLM Answer:`, chatData.answer);
          console.log(`Citations:`, chatData.citations.length);
          
          process.exit(0);
      } else if (checkData.status === 'error') {
          console.log('❌ Failed! Document status is error.');
          process.exit(1);
      }
  }
  console.log('Timeout waiting for processing.');
  process.exit(1);
})();
