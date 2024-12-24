require('dotenv').config();
const Web3 = require('web3');
const utils = require('./src/Utils.js');

const startingIndex = 36
const count = 15

async function bridgeETH(privateKey) {
  try {
    // **1. Initialize Web3**
    const web3 = new Web3('https://lb.drpc.org/ogrpc?network=arbitrum&dkey=AhLZ4403Skvhsfcs6AxndQcUumBtqzAR75amDonbV6cR'); // Arbitrum RPC URL
    // const privateKey = '36316196fe8bdcda082f72183eb6bb4955682b9f2c8413e13c8e0c11bf06ee7b';

    if (!privateKey) {
      throw new Error('Private key not set. Please set your PRIVATE_KEY environment variable.');
    }

    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    // **2. Calculate 95% of ETH balance**
    const amountToBridgeEth = await calculateAmountToBridge(web3);

    // **3. Include Bridge Fee**
    const bridgeFeeEth = 0.0005; // Bridge fee in ETH

    // **4. Calculate Total Amount**
    const totalAmountEth = amountToBridgeEth + bridgeFeeEth;

    // **5. Format Total Amount**
    const totalAmountEthStr = formatAmount(totalAmountEth);

    // **6. Convert to Wei**
    const totalAmountWei = web3.utils.toWei(totalAmountEthStr, 'ether');

    // **7. Bridge Contract Address**
    const bridgeContractAddress = '0x5e809A85Aa182A9921EDD10a4163745bb3e36284'; // Owlto Bridge Contract on Arbitrum

    // **8. Create and Send Transaction**
    const receipt = await sendTransaction(
      web3,
      bridgeContractAddress,
      totalAmountWei
    );

    console.log('Transaction successful! Receipt:', receipt.transactionHash);

    // **9. Wait for Bridge Receipt (Optional)**
    // You can implement a function to check the status of the bridge if the API supports it.

  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

async function calculateAmountToBridge(web3) {
  const balanceWei = await web3.eth.getBalance(web3.eth.defaultAccount);
  const balanceEth = parseFloat(web3.utils.fromWei(balanceWei, 'ether'));

  // **Calculate 95% of the balance as the amount to bridge**
  const amountToBridgeEth = balanceEth * 0.985;

  // **Ensure there are sufficient funds after accounting for bridge fee and gas**
  const bridgeFeeEth = 0.0005; // Bridge fee in ETH
  const gasEstimateEth = 0.000002; // Estimate for gas fees
  const totalDeduction = amountToBridgeEth + bridgeFeeEth + gasEstimateEth;

  if (totalDeduction >= balanceEth) {
    throw new Error('Insufficient balance to bridge after accounting for fees.');
  }

  return amountToBridgeEth;
}

function formatAmount(totalAmountEth) {
  // Convert the amount to a string with 18 decimal places
  let amountStr = totalAmountEth.toFixed(18);

  // Find the position of the decimal point
  let decimalIndex = amountStr.indexOf('.');
  if (decimalIndex === -1) {
    throw new Error('Invalid amount format');
  }

  // We need to keep '0.000X', which is up to 5 characters after the decimal point
  // '0.' is two characters, so we take up to decimalIndex + 5
  let prefixLength = decimalIndex + 5; // Includes '0.'
  if (amountStr.length < prefixLength) {
    throw new Error('Amount is too small to format');
  }

  let prefix = amountStr.substring(0, prefixLength); // '0.000X'

  // Number of decimal digits in prefix (excluding '0.')
  let decimalDigitsInPrefix = prefix.length - (decimalIndex + 1);

  // Number of zeros to append: 18 - decimalDigitsInPrefix - 1 (for the '9' at the end)
  let zerosToAppend = 18 - decimalDigitsInPrefix - 1;

  let zeros = '0'.repeat(zerosToAppend);

  // Append '9' at the end
  let amountFormatted = prefix + zeros + '9';

  return amountFormatted;
}

async function sendTransaction(web3, toAddress, valueWei) {

  const tx = {
    from: web3.eth.defaultAccount,
    to: toAddress,
    value: valueWei,
    data: '0x', // No input data
    gas: 150000, // Estimate gas limit
    gasPrice: await web3.utils.toWei('0.2500001', 'gwei'),
    nonce: await web3.eth.getTransactionCount(web3.eth.defaultAccount),
  };

  const signedTx = await web3.eth.accounts.signTransaction(
    tx,
    web3.eth.accounts.wallet[0].privateKey
  );
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

  return receipt;
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
        // Adjust based on the number of pairs
        const privateKey = process.env[`PRIVATE_KEY_EVM${i}`];
        const address = process.env[`SENDER_ADDRESS_EVM${i}`];

        if (privateKey && address) {
            pairs.push({ privateKey, address });
        }
    }

    // Shuffle the array to randomize the order
    shuffleArray(pairs);
    return pairs;
}

async function bridgeToTaiko() {
    const pairs = await loadAndShuffleKeysAndAddresses(startingIndex, count)

    for (const { privateKey, address } of pairs) {
        console.log('Wallet address - ' + address)
        await bridgeETH(privateKey)
        await utils.delay(utils.getRandomBetween(10000, 25000))
    }
}

bridgeToTaiko()

