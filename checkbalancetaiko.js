const Web3 = require('web3');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const rpcEndpoints = [
  'https://lb.drpc.org/ogrpc?network=base&dkey=AhLZ4403Skvhsfcs6AxndQcUumBtqzAR75amDonbV6cR',
];

// Configure Wallets here
const startingIndex = 0;
const count = 31;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function loadAndShuffleKeysAndAddresses(startingIndex, count) {
  const pairs = [];
  for (let i = startingIndex; i < startingIndex + count; i++) {
    const privateKey = process.env[`PRIVATE_KEY_EVM${i}`];
    const address = process.env[`SENDER_ADDRESS_EVM${i}`];

    if (privateKey && address) {
      pairs.push({ privateKey, address });
    }
  }

  shuffleArray(pairs);
  return pairs;
}

async function run() {
  const pairs = await loadAndShuffleKeysAndAddresses(startingIndex, count);
  let totalbalance = 0
  for (const { address } of pairs) {
    const balance = await checkETHBalance(address).catch(console.error);// Optional delay to avoid hitting rate limits
    totalbalance += parseFloat(balance)
  }
  console.log('Total balance - ' + totalbalance)
}

// Function to check ETH balance
async function checkETHBalance(address) {
    const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.zklink.io'));

    try {
      const balanceWei = await web3.eth.getBalance(address);
      const balanceEth = web3.utils.fromWei(balanceWei, 'ether');

      console.log(`Address: ${address}, ETH Balance: ${balanceEth} ETH`);
      return balanceEth
    } catch (error) {
      console.error(`Error fetching ETH balance for ${address}:`, error);
    }
}

// Execute the function
run().catch(console.error);
