# AutoIncome Engines™ | Sovereign Core

<div align="center">
  <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1200&h=630" alt="AutoIncome Engines Banner" width="100%" />
</div>

## Sovereign Wealth Automation & AI Revenue Nodes

Deploy institutional-grade wealth automation with AutoIncome Engines™. This system allows you to manage autonomous neural nodes, generate passive yield, and oversee sovereign digital assets through a high-fidelity dashboard.

**Live Deployment:** [https://auto-income-engines.vercel.app](https://auto-income-engines.vercel.app)  
**Repository:** [https://github.com/malatjimaphalle1-AIE/autoincome-engines-](https://github.com/malatjimaphalle1-AIE/autoincome-engines-)

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm v9+

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/malatjimaphalle1-AIE/autoincome-engines-.git
    cd autoincome-engines-
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    # AI Gateway (Required for Neural Features)
    AI_GATEWAY_API_KEY=your_key_here
    
    # Payment Processing (Optional)
    PAYPAL_MODE=live
    PAYPAL_CLIENT_ID=your_paypal_client_id
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Access the dashboard at `http://localhost:5173`

5.  **Run Backend Server** (for API features)
    ```bash
    npm run start:server
    ```
    Server runs on `http://localhost:3001`

---

## 🌐 Deployment

This project is configured for seamless deployment on **Vercel**.

1.  Push your code to the repository.
2.  Import the project into Vercel.
3.  The `vercel.json` configuration will automatically handle routing for the Single Page Application (SPA) and Serverless Functions.

---

## 🛡️ Architecture

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express (Serverless compatible)
- **Database**: Local JSON Storage (Ephemeral on Vercel) / MongoDB (Recommended for Production)
- **Security**: Neural Uplink Encryption & Role-Based Access Control

---

© 2024 AutoIncome Engines™. All Rights Reserved.
