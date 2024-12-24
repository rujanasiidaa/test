const Web3 = require('web3');
require('dotenv').config();

// Constants
const ETH_THRESHOLD = Web3.utils.toWei("0.02", "ether");
const SEND_PERCENTAGE = 0.988; // 98.8%
const PROVIDERS = {
  base: new Web3(new Web3.providers.HttpProvider("https://lb.drpc.org/ogrpc?network=base&dkey=AhLZ4403Skvhsfcs6AxndQf-Nd2vjg0R77o6TgFkVp5j")),
  arbitrum: new Web3(new Web3.providers.HttpProvider("https://lb.drpc.org/ogrpc?network=arbitrum&dkey=AhLZ4403Skvhsfcs6AxndQf-Nd2vjg0R77o6TgFkVp5j"))
};

// Shuffle function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Load and shuffle key-address pairs
async function loadAndShuffleKeysAndAddresses(startingIndex, count) {
  const pairs = [];
  for (let i = startingIndex; i < startingIndex + count; i++) {
    const privateKey = process.env[`PRIVATE_KEY_EVM${i}`];
    const address = process.env[`SENDER_ADDRESS_EVM${i}`];
    const bitgetDepositAddress = process.env[`BITGET_WITHDRAWAL_ADDRESS_EVM${i}`];

    if (privateKey && address && bitgetDepositAddress) {
      pairs.push({ privateKey, address, bitgetDepositAddress });
    }
  }

  shuffleArray(pairs);
  return pairs;
}

// Check balance and send ETH
async function checkAndSendEth(web3, pair) {
  const account = web3.eth.accounts.privateKeyToAccount(pair.privateKey);
  web3.eth.accounts.wallet.add(account);

  try {
    const balance = await web3.eth.getBalance(pair.address);

    // Check if balance is above 0.1 ETH
    if (Web3.utils.toBN(balance).gte(Web3.utils.toBN(ETH_THRESHOLD))) {
      const sendAmount = Web3.utils.toBN(balance).mul(Web3.utils.toBN(Math.floor(SEND_PERCENTAGE * 1000))).div(Web3.utils.toBN(1000));
      const gasPrice = await web3.eth.getGasPrice();
      const gasEstimate = await web3.eth.estimateGas({
        to: pair.bitgetDepositAddress,
        from: pair.address,
        value: sendAmount
      });

      const tx = {
        to: pair.bitgetDepositAddress,
        value: sendAmount,
        gas: gasEstimate,
        gasPrice: gasPrice
      };

      const signedTx = await web3.eth.accounts.signTransaction(tx, pair.privateKey);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      console.log(`Sent ${Web3.utils.fromWei(sendAmount.toString(), "ether")} ETH from ${pair.address} to ${pair.bitgetDepositAddress}`);
      console.log(`Transaction Hash: ${receipt.transactionHash}`);
    } else {
      console.log(`Balance is below 0.02 ETH for address ${pair.address}`);
    }
  } catch (error) {
    console.error(`Error processing ${pair.address}:`, error);
  } finally {
    web3.eth.accounts.wallet.remove(account.address);
  }
}

// Main function
async function main() {
  const startingIndex = 50; // Adjust as needed
  const count = 100; // Adjust as needed
  const pairs = await loadAndShuffleKeysAndAddresses(startingIndex, count);

  for (const pair of pairs) {
    // await checkAndSendEth(PROVIDERS.base, pair);
    await checkAndSendEth(PROVIDERS.arbitrum, pair);
  }
}

main().catch(error => {
  console.error("Error in script:", error);
});
