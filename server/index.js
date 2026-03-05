import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Root Route: Health Check
app.get('/', (req, res) => {
  res.send('AutoIncome Engines Backend is Running');
});

// Helper: Get PayPal Base URL
const getPayPalBaseUrl = () => {
  return (process.env.PAYPAL_MODE === 'live' || process.env.PAYPAL_MODE === 'LIVE')
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
};

// Helper: Get PayPal Access Token
const getAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal Credentials');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Auth Failed: ${errorText}`);
  }

  const data = await response.json();
  console.log(`[PayPal Token] Generated Token. Scopes: ${data.scope}`);
  return data.access_token;
};

// Route: Check Connection Status
app.get('/api/paypal/status', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ 
        status: 'connected', 
        mode: process.env.PAYPAL_MODE || 'sandbox',
        tokenPreview: token.substring(0, 10) + '...'
    });
  } catch (error) {
    console.error('PayPal Connection Error:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Route: Create Payout
app.post('/api/paypal/payout', async (req, res) => {
  try {
    const { email, amount, note } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: 'Email and amount are required' });
    }

    const token = await getAccessToken();
    const senderBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const payload = {
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject: "AutoIncome Engines™ Liquidity Exit",
        email_message: "Your autonomous yield has been successfully settled."
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: Number(amount).toFixed(2),
            currency: "USD"
          },
          note: note || "Grid Node Liquidity Settlement",
          receiver: email
        }
      ]
    };

    const response = await fetch(`${getPayPalBaseUrl()}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal Payout Error Status:', response.status);
      console.error('PayPal Payout Error Body:', JSON.stringify(data, null, 2));
      
      // Enhance error message if it's an authorization issue
      if (response.status === 401 || response.status === 403 || data.name === 'AUTHORIZATION_ERROR') {
         data.message = (data.message || 'Authorization Failed') + " (Check if 'Payouts' are enabled in your PayPal App settings)";
      }
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Payout Exception:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Route: Update Credentials
app.post('/api/config/update-credentials', async (req, res) => {
  console.log('Update Credentials Request:', req.body);
  const { clientId, clientSecret, mode } = req.body;
  
  if (!clientId || !clientSecret || !mode) {
    return res.status(400).json({ error: 'Missing fields', details: 'Client ID, Secret, and Mode are required' });
  }

  // Determine URL based on mode
  const url = mode.toLowerCase() === 'live' 
    ? 'https://api-m.paypal.com/v1/oauth2/token'
    : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    console.log('Verifying credentials against:', url);
    // 1. Verify credentials with PayPal
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    console.log('PayPal Response Status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('PayPal Verification Failed:', response.status, errorText); // Log details
        
        // Try to parse error as JSON to get a better message
        let parsedError = errorText;
        try {
            const jsonError = JSON.parse(errorText);
            parsedError = jsonError.error_description || jsonError.message || errorText;
        } catch (e) {}

        return res.status(400).json({ 
            error: 'Invalid Credentials', 
            details: `PayPal API Error (${response.status}): ${parsedError}` 
        });
    }

    // 2. If valid, update .env file (Local only)
    if (!process.env.VERCEL) {
        try {
            const envPath = path.resolve(process.cwd(), '.env');
            console.log('Updating .env at:', envPath);
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }

            // Helper to replace or append env var
            const updateEnvVar = (key, value) => {
                const regex = new RegExp(`^${key}=.*`, 'm');
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                    envContent += `\n${key}=${value}`;
                }
            };

            updateEnvVar('PAYPAL_CLIENT_ID', clientId);
            updateEnvVar('PAYPAL_CLIENT_SECRET', clientSecret);
            updateEnvVar('PAYPAL_MODE', mode);

            fs.writeFileSync(envPath, envContent);
            console.log('.env updated successfully');
        } catch (fsError) {
            console.error('Failed to write .env file:', fsError);
            // Don't fail the request, just log it. Runtime env is updated below.
        }
    }

    // 3. Update runtime process.env so restart isn't strictly necessary for immediate use
    process.env.PAYPAL_CLIENT_ID = clientId;
    process.env.PAYPAL_CLIENT_SECRET = clientSecret;
    process.env.PAYPAL_MODE = mode;

    const message = process.env.VERCEL 
        ? 'Credentials verified. IMPORTANT: You must manually update Environment Variables in Vercel Dashboard.'
        : 'Credentials updated and verified. Bridge is Online.';

    res.json({ success: true, message: message });

  } catch (error) {
    console.error('Update failed with exception:', error);
    res.status(500).json({ error: 'Update failed', details: error.message, stack: error.stack });
  }
});

const DATA_FILE = path.resolve(process.cwd(), 'data.json');

// Helper: Load Data
const loadData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        return { referrals: [] };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

// Helper: Save Data
const saveData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Route: Simulate Referral (Live Persistence)
app.post('/api/referrals/simulate', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const newRefId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        // Random reward between $50 and $150
        const reward = 50 + Math.random() * 100;
        
        const newReferral = {
            id: newRefId,
            userId: userId,
            name: `Peer Node ${Math.floor(Math.random() * 9000) + 1000}`,
            tier: ['Associate', 'Partner', 'Strategist'][Math.floor(Math.random() * 3)],
            nodes: Math.floor(Math.random() * 5) + 1,
            reward: Number(reward.toFixed(2)),
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
        };

        // Persist to file
        const data = loadData();
        data.referrals = data.referrals || [];
        data.referrals.push(newReferral);
        saveData(data);
        
        // Simulating Network Latency
        await new Promise(resolve => setTimeout(resolve, 800));

        res.json({
            success: true,
            referral: newReferral,
            message: 'Referral processed and persisted successfully'
        });

    } catch (error) {
        console.error('Referral Simulation Error:', error);
        res.status(500).json({ error: 'Failed to process referral' });
    }
});

// Route: Track New Real Referral (Click)
app.post('/api/referrals/track', async (req, res) => {
    try {
        const { referrerId, visitorIp, visitorAgent } = req.body;
        if (!referrerId) {
            return res.status(400).json({ error: 'Referrer ID is required' });
        }

        // Load DB
        const data = loadData();
        data.referralClicks = data.referralClicks || [];

        // Log the click
        data.referralClicks.push({
            referrerId,
            ip: visitorIp || 'unknown',
            agent: visitorAgent || 'unknown',
            timestamp: Date.now()
        });

        saveData(data);

        res.json({ success: true, message: 'Referral click tracked' });
    } catch (error) {
        console.error('Referral Tracking Error:', error);
        res.status(500).json({ error: 'Failed to track referral' });
    }
});

// Route: Register New User via Referral (Conversion)
app.post('/api/referrals/convert', async (req, res) => {
    try {
        const { referrerId, newUserId, newUserName } = req.body;
        
        if (!referrerId || !newUserId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const data = loadData();
        data.referrals = data.referrals || [];

        // Check if already referred to avoid duplicates (simplified check)
        const existing = data.referrals.find(r => r.id === newUserId);
        if (existing) {
             return res.status(400).json({ error: 'User already registered' });
        }

        // Calculate Reward (Simplified Logic)
        const reward = 100.00; // Fixed reward for live testing

        const newReferral = {
            id: newUserId,
            userId: referrerId, // The person who gets the reward
            name: newUserName || `User ${newUserId.substr(0,5)}`,
            tier: 'Associate',
            nodes: 1, // New users start with 1 node
            reward: reward,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            status: 'Verified'
        };

        data.referrals.push(newReferral);
        saveData(data);

        res.json({ success: true, referral: newReferral });

    } catch (error) {
        console.error('Referral Conversion Error:', error);
        res.status(500).json({ error: 'Failed to convert referral' });
    }
});

// Route: Get User Referrals
app.get('/api/referrals/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const data = loadData();
        const userReferrals = (data.referrals || []).filter(r => r.userId === userId);
        res.json({ referrals: userReferrals });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch referrals' });
    }
});

// Start Server only if not running in a serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`PayPal Mode: ${process.env.PAYPAL_MODE || 'sandbox'}`);
  });
}

export default app;
