
/**
 * PayPalService handles the integration with the PayPal Payouts API.
 * In a production environment, these calls should typically be proxied through a backend
 * to protect Client Secrets, but here we implement the logic for the requested architecture.
 */
export const paypalService = {
  getApiBase: () => '/api/paypal', // Point to local proxy

  /**
   * Verifies if the backend server is reachable and credentials are valid.
   */
  checkConnection: async () => {
    try {
      const response = await fetch(`${paypalService.getApiBase()}/status`);
      if (response.ok) {
        const data = await response.json();
        return data.status === 'connected';
      }
      return false;
    } catch (error) {
      console.warn("Backend Connection Failed:", error);
      return false;
    }
  },

  /**
   * Executes a payout via the backend server.
   */
  createPayout: async (email: string, amount: number) => {
    try {
      const response = await fetch(`${paypalService.getApiBase()}/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount,
          note: "Grid Node Liquidity Settlement"
        })
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        // If not JSON, it's likely an error page or raw text
        if (!response.ok) {
            throw new Error(text || `HTTP Error ${response.status}`);
        }
        // If success but not JSON? Unexpected for this API
        data = { message: text };
      }

      if (!response.ok) {
        console.error("PayPal Service Payout Error:", data);
        throw new Error(data.message || data.error || data.error_description || 'PAYPAL_PAYOUT_ERROR');
      }

      return data;
    } catch (error) {
      console.error("PayPal Service Error:", error);
      throw error;
    }
  }
};
