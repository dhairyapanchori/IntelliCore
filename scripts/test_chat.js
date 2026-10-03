const { spawn } = require('child_process');

(async () => {
  const resLogin = await fetch('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'e2e_1784991898144@intellicore.ai', password: 'Password123!' }) // or any valid user
  });
  
  let access_token = null;
  if (!resLogin.ok) {
      const testEmail = `chat_test_${Date.now()}@intellicore.ai`;
      await fetch('http://127.0.0.1:8001/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'Password123!', full_name: 'Chat Tester' })
      });
      const resLogin2 = await fetch('http://127.0.0.1:8001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testEmail, password: 'Password123!' })
      });
      access_token = (await resLogin2.json()).access_token;
  } else {
      access_token = (await resLogin.json()).access_token;
  }
  
  const resSearch = await fetch(`http://127.0.0.1:8001/api/v1/chat/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'what did dhairya actually built in project' })
  });
  
  console.log(await resSearch.json());
})();
