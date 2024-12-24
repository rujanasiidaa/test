const axios = require('axios');
const fs = require('fs');
require('dotenv').config(); // Load variables from .env
const { HttpsProxyAgent } = require('https-proxy-agent'); // For HTTPS proxy
const utils = require('./src/Utils.js');


const startingIndex = 0;  // Starting index
const count = 151;      


let totalPoints = 0;

// Unique log file name based on current date and time
const logFile = `./logs/taikolg/rank_check_log_${new Date().toISOString().replace(/:/g, '-')}.csv`;

// Function to write to CSV file
function logToCSV(walletAddress, rank, points) {
    const line = `${walletAddress},${rank},${points}\n`;
    fs.appendFileSync(logFile, line, (err) => {
        if (err) throw err;
    });
}

// Function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Load and shuffle keys and addresses
async function loadAndShuffleKeysAndAddresses(startingIndex, count) {
    const pairs = [];
    for (let i = startingIndex; i < startingIndex + count; i++) {
        const privateKey = process.env[`PRIVATE_KEY_EVM${i}`];
        const address = process.env[`SENDER_ADDRESS_EVM${i}`];
        const okxDepositAddress = process.env[`OKX_WITHDRAWAL_ADDRESS_EVM${i}`];

        if (privateKey && address && okxDepositAddress) {
            pairs.push({ privateKey, address, okxDepositAddress });
        } else {
            console.warn(`Missing data for index ${i}: Ensure PRIVATE_KEY_EVM${i}, SENDER_ADDRESS_EVM${i}, and OKX_WITHDRAWAL_ADDRESS_EVM${i} are set.`);
        }
    }

    shuffleArray(pairs); // Shuffle array for random order
    return pairs;
}

// Function to generate a random user-agent string
function generateRandomUserAgent() {
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
    const operatingSystems = [
        'Windows NT 10.0; Win64; x64',
        'Macintosh; Intel Mac OS X 10_15_7',
        'X11; Linux x86_64',
        'iPhone; CPU iPhone OS 14_0 like Mac OS X',
        'Android 11; Mobile'
    ];
    const browserVersions = {
        'Chrome': ['115.0.0.0', '114.0.0.0', '113.0.0.0', '112.0.0.0'],
        'Firefox': ['115.0', '114.0', '113.0', '112.0'],
        'Safari': ['14.1.2', '13.1.2', '12.1.2'],
        'Edge': ['115.0.0.0', '114.0.0.0'],
        'Opera': ['101.0.0.0', '100.0.0.0']
    };
    const webkits = ['537.36', '605.1.15'];
    const platforms = ['Windows', 'Macintosh', 'X11', 'iPhone', 'Android'];

    // Randomly select components
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const os = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];
    const browserVersionList = browserVersions[browser];
    const browserVersion = browserVersionList[Math.floor(Math.random() * browserVersionList.length)];
    const webkitVersion = webkits[Math.floor(Math.random() * webkits.length)];

    let userAgent = '';

    if (browser === 'Chrome' || browser === 'Edge' || browser === 'Opera') {
        userAgent = `Mozilla/5.0 (${os}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) ${browser}/${browserVersion} Safari/${webkitVersion}`;
    } else if (browser === 'Firefox') {
        userAgent = `Mozilla/5.0 (${os}; rv:${browserVersion}) Gecko/20100101 Firefox/${browserVersion}`;
    } else if (browser === 'Safari') {
        userAgent = `Mozilla/5.0 (${os}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) Version/${browserVersion} Safari/${webkitVersion}`;
    }

    return userAgent;
}

// Proxy configuration
const proxyUrl = 'http://user126655:gudjq8@146.247.110.36:8402'; // Replace with your proxy URL

// Function to make API request to Taiko rank API
const checkRank = async (walletAddress) => {
    try {
        // Generate a random user-agent
        const randomUserAgent = generateRandomUserAgent();

        // Set up proxy agent for HTTPS requests
        const agent = new HttpsProxyAgent(proxyUrl);

        const response = await axios.get(
            `https://trailblazer.mainnet.taiko.xyz/s2/user/rank?address=${walletAddress}`,
            {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en;q=0.9',
                    'dnt': '1',
                    'origin': 'https://trailblazers.taiko.xyz',
                    'referer': 'https://trailblazers.taiko.xyz/',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                    'user-agent': randomUserAgent,
                },
                httpsAgent: agent, // Use httpsAgent for HTTPS requests
                timeout: 10000,    // Optional timeout
            }
        );

        const rank = response.data.rank;
        const points = Math.floor(response.data.score); // Round points to integer

        console.log(`Rank for ${walletAddress}: ${rank}, Points: ${points}`);
        logToCSV(walletAddress, rank, points); // Write to CSV

        totalPoints += points;
    } catch (error) {
        console.error(`Error fetching rank for ${walletAddress}:`, error.message);
    }
};

// Main function to execute checks
async function main() {
    // Number of addresses

    console.log('Starting rank checks...');
    fs.writeFileSync(logFile, "Wallet Address,Rank,Points\n"); // CSV headers

    // Load and shuffle addresses
    const pairs = await loadAndShuffleKeysAndAddresses(startingIndex, count);

    // Check each address
    for (let i = 0; i < pairs.length; i++) {
        const { address } = pairs[i];
        await checkRank(address);
        await utils.delay(utils.getRandomBetween(1000,3000))
    }

    console.log(`Total points: ${totalPoints}`);
    console.log('Rank checks completed.');
}

main();
