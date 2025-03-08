const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios'); // Add axios for HTTP requests
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public')); // Serve static files from 'public' directory
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuration - Store these securely in environment variables in production
const config = {
    merchantId: "64202401241343341660509", // Replace with your actual merchant ID
    secretKey: "4511adbb67074ee6876b8510c2d32817",   // Replace with your actual secret key
    returnUrl: "http://localhost:3000/payment-success", // For local testing
    notifyUrl: "http://localhost:3000/payment-notification" // For local testing
};

// Serve the payment form
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/payment.html');
});

// Process payment request
app.get('/check-transaction', (req, res) => {
    try {
        // Extract form data
        const orderId = req.query["orderId"];
        
        // Create payment parameters
        const params = {
            merchant_id: config.merchantId,
            increment_id: orderId,
            nonce_str: generateNonceStr(),
            service: 'create_trade_query'
        };
        
        // Generate signature
        const signature = generateSignature(params, config.secretKey);
        
        // Add signature and sign_type after generating the signature
        params.signature = signature;
        params.sign_type = 'MD5';
        
        // Redirect to payment gateway
        const baseUrl = 'https://api.wetopay.com/api/v1/info/smartpay';
        const queryString = Object.keys(params)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
            
        const finalUrl = `${baseUrl}?${queryString}`;
        res.redirect(finalUrl);
    } catch (error) {
        console.error('Error checking transaction:', error);
        res.status(500).send('An error occurred while checking the transaction');
    }
});

app.get('/check-transaction-json', async (req, res) => {
    try {
        // Extract form data
        const orderId = req.query["orderId"];
        
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }
        
        // Create payment parameters
        const params = {
            merchant_id: config.merchantId,
            increment_id: orderId,
            nonce_str: generateNonceStr(),
            service: 'create_trade_query'
        };
        
        // Generate signature
        const signature = generateSignature(params, config.secretKey);
        
        // Add signature and sign_type after generating the signature
        params.signature = signature;
        params.sign_type = 'MD5';
        
        // Build query URL
        const baseUrl = 'https://api.wetopay.com/api/v1/info/smartpay';
        const queryString = Object.keys(params)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
            
        const finalUrl = `${baseUrl}?${queryString}`;
        const response = await axios.get(finalUrl);
        return res.json(response.data);
    } catch (error) {
        console.error('Error checking transaction:', error);
        res.status(500).json({ error: 'An error occurred while checking the transaction' });
    }
});

// Helper functions
function generateNonceStr(length = 16) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function generateSignature(params, secretKey) {
    // Create a copy of params to avoid modifying the original
    const paramsCopy = {...params};
    
    // Sort parameters by key
    const sortedKeys = Object.keys(paramsCopy).sort();
    
    // Create the query string
    const signString = sortedKeys.map(key => `${key}=${paramsCopy[key]}`).join('&');
    
    // Append the secret key
    const signStringKey = signString + secretKey;
    
    // Generate MD5 hash
    const signature = crypto.createHash('md5').update(signStringKey, 'utf8').digest('hex');
    
    return signature;
}

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 