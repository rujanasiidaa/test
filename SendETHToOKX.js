const Web3 = require('web3');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const USDC_CONTRACT_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // USDC contract address on Ethereum
const USDC_DECIMALS = 6;
const USDC_ABI = [
  // Only the methods we need for balance and transfer
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "success", "type": "bool" }],
    "type": "function"
  }
];

const rpcEndpoints = [
  'https://lb.drpc.org/ogrpc?network=arbitrum&dkey=AhLZ4403Skvhsfcs6AxndQf-Nd2vjg0R77o6TgFkVp5j',
];

// Configure addresss here

const startingIndex = 0;
const count = 51;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomBetween(minValue, maxValue) {
  const decimalPlaces = Math.max(
    (minValue.toString().split('.')[1] || '').length,
    (maxValue.toString().split('.')[1] || '').length,
  );

  const multiplier = Math.pow(10, decimalPlaces);
  minValue *= multiplier;
  maxValue *= multiplier;

  const randomValue = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
  return randomValue / multiplier;
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
    const okxDepositAddress = process.env[`OKX_WITHDRAWAL_ADDRESS_EVM${i}`];

    if (privateKey && address && okxDepositAddress) {
      pairs.push({ privateKey, address, okxDepositAddress });
    }
  }

  shuffleArray(pairs);
  return pairs;
}

async function run() {
  const pairs = await loadAndShuffleKeysAndAddresses(startingIndex, count);

  for (const { privateKey, address, okxDepositAddress } of pairs) {
    await sendUSDCToExchange(privateKey, address, okxDepositAddress).catch(console.error);
    await sendEthToExchange(privateKey, address, okxDepositAddress).catch(console.error);
    await delay(getRandomBetween(10000, 15000));
  }
}

// Function to send ETH
async function sendEthToExchange(privateKey, address, okxDepositAddress) {
  for (let rpc of rpcEndpoints) {
    const web3 = new Web3(new Web3.providers.HttpProvider(rpc));

    try {
      // Check the balance
      const balance = await web3.eth.getBalance(address);
      const balanceInEth = web3.utils.fromWei(balance, 'ether');

      console.log(`ETH Balance on network ${address}: ${balanceInEth} ETH`);

      if (balance > 0) {
        const nonce = await web3.eth.getTransactionCount(address);
        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 150000; // Typical gas limit for a standard ETH transfer
        const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit)); // Gas cost in wei

        // Calculate sendAmount in wei (subtract gas cost from the total balance)
        const sendAmount = web3.utils.toBN(balance).sub(gasCost);

        if (sendAmount.isNeg()) {
          console.log('Insufficient balance to cover gas fees.');
          continue;
        }

        // Create transaction object
        const txParams = {
          from: address,
          to: okxDepositAddress,
          value: web3.utils.toHex(sendAmount), // Send the remaining balance
          gas: web3.utils.toHex(gasLimit),
          gasPrice: web3.utils.toHex(gasPrice),
          nonce: web3.utils.toHex(nonce),
          chainId: await web3.eth.getChainId(),
        };

        // Sign the transaction
        const signedTx = await web3.eth.accounts.signTransaction(txParams, privateKey);

        // Send the transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`ETH Transaction successful with hash: ${receipt.transactionHash}`);
      } else {
        console.log('No ETH balance to send.');
      }
    } catch (error) {
      console.error(`Error on address ${address}:`, error);
    }
  }
}

// Function to send USDC
async function sendUSDCToExchange(privateKey, address, okxDepositAddress) {
  for (let rpc of rpcEndpoints) {
    const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const usdcContract = new web3.eth.Contract(USDC_ABI, USDC_CONTRACT_ADDRESS);

    try {
      const balance = await usdcContract.methods.balanceOf(address).call();
      const balanceInUSDC = balance / Math.pow(10, USDC_DECIMALS);

      console.log(`USDC Balance on address ${address}: ${balanceInUSDC} USDC`);

      if (balance > 0) {
        const nonce = await web3.eth.getTransactionCount(address);
        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 300000; // Adjust gas limit for USDC transfer

        const txParams = {
          from: address,
          to: USDC_CONTRACT_ADDRESS,
          gas: web3.utils.toHex(gasLimit),
          gasPrice: web3.utils.toHex(gasPrice),
          nonce: web3.utils.toHex(nonce),
          data: usdcContract.methods.transfer(okxDepositAddress, balance.toString()).encodeABI(),
          chainId: await web3.eth.getChainId(),
        };

        const signedTx = await web3.eth.accounts.signTransaction(txParams, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        console.log(`USDC Transaction successful with hash: ${receipt.transactionHash}`);
      } else {
        console.log('No USDC balance to send.');
      }
    } catch (error) {
      console.error(`Error on network ${address}:`, error);
    }
  }
}

// Execute the function
run().catch(console.error);
