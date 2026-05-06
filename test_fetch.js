const fetch = require('node-fetch');

async function testApi() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@travelplanner.id', password: 'password123' })
    });
    const authData = await res.json();
    console.log('Login:', authData.pesan || authData.token);
    
    if (!authData.token) return;

    const res2 = await fetch('http://localhost:3000/api/itinerary/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      },
      body: JSON.stringify({
        duration_days: 2,
        total_budget: 500000,
        start_latitude: -7.3274,
        start_longitude: 108.2207,
        city_preference: "Tasikmalaya"
      })
    });
    
    console.log('Status:', res2.status);
    const data = await res2.json();
    console.log('Response:', data);
  } catch(e) {
    console.error(e);
  }
}

testApi();
