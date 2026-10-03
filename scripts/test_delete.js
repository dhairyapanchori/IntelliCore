const fs = require('fs');

(async () => {
  const resLogin = await fetch('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'e2e_1784991898144@intellicore.ai', password: 'Password123!' }) // use existing user
  });
  const data = await resLogin.json();
  const access_token = data.access_token;
  const authHeaders = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };
  
  // Wait for server ready
  await new Promise(r => setTimeout(r, 2000));
  // get hierarchy
  const orgsRes = await (await fetch(`http://127.0.0.1:8001/api/v1/organizations`, { headers: authHeaders })).json();
  if (!orgsRes || !orgsRes.length) throw new Error("No organizations found for this user");
  const orgId = orgsRes[0].id;
  const wsId = (await (await fetch(`http://127.0.0.1:8001/api/v1/workspaces?organization_id=${orgId}`, { headers: authHeaders })).json())[0].id;
  const deptId = (await (await fetch(`http://127.0.0.1:8001/api/v1/departments?workspace_id=${wsId}`, { headers: authHeaders })).json())[0].id;

  // Create Collection
  const resCreateCol = await fetch(`http://127.0.0.1:8001/api/v1/collections`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'Delete Testing', department_id: deptId })
  });
  const colId = (await resCreateCol.json()).id;
  console.log(`Created collection ${colId}. Uploading file...`);
  
  const blob = new Blob(["Test document for deletion!"], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', blob, 'deleteme.txt');
  
  const docId = (await (await fetch(`http://127.0.0.1:8001/api/v1/documents/upload?collection_id=${colId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}` },
    body: formData
  })).json()).id;
  console.log(`Uploaded document ${docId}. Waiting for sync...`);
  
  for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const checkData = await (await fetch(`http://127.0.0.1:8001/api/v1/documents/${docId}`, { headers: authHeaders })).json();
      if (checkData.status === 'completed') {
          console.log('✅ Document synced.');
          
          console.log('Deleting Document...');
          const resDeleteDoc = await fetch(`http://127.0.0.1:8001/api/v1/documents/${docId}`, {
            method: 'DELETE',
            headers: authHeaders
          });
          console.log(`Delete Document status: ${resDeleteDoc.status}`);
          if (resDeleteDoc.status !== 204) throw new Error("Doc delete failed");
          
          console.log('Deleting Collection...');
          const resDeleteCol = await fetch(`http://127.0.0.1:8001/api/v1/collections/${colId}`, {
            method: 'DELETE',
            headers: authHeaders
          });
          console.log(`Delete Collection status: ${resDeleteCol.status}`);
          if (resDeleteCol.status !== 204) throw new Error("Col delete failed");
          
          console.log('✅ Success! Everything deleted properly.');
          process.exit(0);
      }
  }
  process.exit(1);
})();
