import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api/auth';

const runTest = async () => {
    console.log('Testing Signup...');
    const signupRes = await fetch(`${BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: `test_${Date.now()}@example.com`,
            password: 'securepassword123',
            name: 'Test User'
        })
    });
    const signupData = await signupRes.json();
    console.log('Signup Result:', signupData);

    if (!signupData.success) {
        console.error('Signup failed, stopping test.');
        return;
    }

    const token = signupData.token;
    console.log('\nTesting Login...');
    const loginRes = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: signupData.user.email,
            password: 'securepassword123'
        })
    });
    const loginData = await loginRes.json();
    console.log('Login Result:', loginData);

    if (!loginData.success) {
        console.error('Login failed, stopping test.');
        return;
    }

    console.log('\nTesting Me (Protected Route)...');
    const meRes = await fetch(`${BASE_URL}/me`, {
        method: 'GET',
        headers: { 
            'Authorization': `Bearer ${token}` 
        }
    });
    const meData = await meRes.json();
    console.log('Me Result:', meData);
};

runTest();
