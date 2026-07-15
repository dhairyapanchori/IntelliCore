async function test() {
  try {
    const passwords = ['dude123', 'password', 'Dude@123', 'dude@123', '123456', 'dude1234'];
    let token = null;
    for (const pw of passwords) {
      const loginRes = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: 'dude@company.com', password: pw })
      });
      if (loginRes.ok) {
        const d = await loginRes.json();
        token = d.access_token;
        console.log('Login success with password:', pw);
        break;
      } else {
        console.log('Failed with password:', pw);
      }
    }
    if (!token) {
      console.error('Could not log in - password not found');
      return;
    }

    console.log("\n--- Fetching organizations ---");
    const orgRes = await fetch('http://localhost:8000/api/organizations/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const orgText = await orgRes.text();
    console.log("Status:", orgRes.status);
    console.log("Response:", orgText);

    if (orgRes.ok) {
      const orgs = JSON.parse(orgText);
      if (orgs.length > 0) {
        const orgId = orgs[0].id;
        console.log(`\n--- Fetching workspaces for org ${orgId} ---`);
        const wsRes = await fetch(`http://localhost:8000/api/workspaces/?organization_id=${orgId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Status:", wsRes.status);
        console.log("Response:", await wsRes.text());
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
