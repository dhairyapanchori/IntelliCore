async function test() {
  try {
    console.log("Signing up dummy user...");
    const email = "dummy" + Date.now() + "@test.com";
    const signupRes = await fetch('http://localhost:8000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: "password123",
        full_name: "Dummy User"
      })
    });
    if (!signupRes.ok) {
      console.error("Signup failed:", signupRes.status, await signupRes.text());
      return;
    }
    const signupData = await signupRes.json();
    console.log("Signup success:", signupData.email);

    console.log("Logging in...");
    const loginRes = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: email,
        password: "password123"
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log("Login success, token received.");

    console.log("Fetching organizations...");
    const orgRes = await fetch('http://localhost:8000/api/organizations/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!orgRes.ok) {
      console.error("Fetch failed:", orgRes.status, await orgRes.text());
      return;
    }
    const orgData = await orgRes.json();
    console.log("Organizations:", orgData);

  } catch (err) {
    console.error("Error occurred:", err);
  }
}

test();
