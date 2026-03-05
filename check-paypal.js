
import fetch from 'node-fetch';

const clientId = 'AQ09rav2lzqoFLgUkqUzvkBf6ZwZaqGkirwC4RCo_na3H9ZyqFMWwoaS2n-J-x2qx3LVSdKJoKodQvsD';
const clientSecret = 'EBbq_LloeAbXj-0ogicGyixZ57A1-Rk4vPjOi_aYYX2O6V8PP1AxQcQe10MnPLFhHIR4QSuygh5N-npm';

const check = async (mode) => {
  const url = mode === 'live' 
    ? 'https://api-m.paypal.com/v1/oauth2/token'
    : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  console.log(`Checking ${mode}...`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (response.ok) {
      console.log(`${mode}: SUCCESS`);
      const data = await response.json();
      // console.log(data);
    } else {
      console.log(`${mode}: FAILED`);
      console.log(await response.text());
    }
  } catch (error) {
    console.log(`${mode}: ERROR`, error.message);
  }
};

(async () => {
  await check('sandbox');
  await check('live');
})();
