const fs = require('fs');
const csv = require('csv-parser');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { SigningStargateClient } = require('@cosmjs/stargate');
const { createObjectCsvWriter } = require('csv-writer');

const csvFilePath = 'seeds.csv'; // Replace with the path to your CSV file
const rpcEndpoint = "rpc_url"; // Replace with the RPC endpoint for the Mantra network
const outputCsvPath = 'output_full_seeds.csv'; // Output CSV file path

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

const csvWriter = createObjectCsvWriter({
    path: outputCsvPath,
    header: [
        { id: 'stt', title: 'STT' },
        { id: 'walletAddress', title: 'Wallet Address' },
        { id: 'transactionHash', title: 'Transaction Hash' },
        { id: 'sentAmount', title: 'Sent Amount' }
    ]
});

async function processMnemonic(stt, mnemonic) {
    try {
        // Ensure correct Bech32 prefix for Mantra
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
            prefix: "mantra",
        });

        // Get the first account from the wallet
        const [firstAccount] = await wallet.getAccounts();

        // Create a signing client
        const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);

        // Generate a random amount between 0.01 and 0.05 Mantra
        const randomAmountMantra = (Math.random() * (0.09 - 0.01) + 0.01).toFixed(6);
        const randomAmountUmantra = (randomAmountMantra * 1_000_000).toFixed(0);

        // Prepare transaction details
        const recipient = firstAccount.address; // Send to self
        const amount = {
            denom: "uom",
            amount: randomAmountUmantra, // Amount in umantra
        };
        const fee = {
            amount: [{
                denom: "uom",
                amount: "100", // Fee amount in umantra
            }],
            gas: "200000", // Gas limit
        };

        // Create and broadcast the transaction
        const result = await client.sendTokens(firstAccount.address, recipient, [amount], fee, "");

        // Print wallet address and transaction hash
        console.log("Wallet Address:", firstAccount.address);
        console.log("Transaction Hash:", result.transactionHash);
        console.log(`Sent Amount: ${randomAmountMantra} MANTRA (${randomAmountUmantra} umantra)`);

        // Record the transaction details
        await csvWriter.writeRecords([{
            stt: stt,
            walletAddress: firstAccount.address,
            transactionHash: result.transactionHash,
            sentAmount: `${randomAmountMantra} MANTRA (${randomAmountUmantra} umantra)`
        }]);

        // Disconnect the client
        client.disconnect();
    } catch (error) {
        console.error("Error occurred while sending tokens:", error);
    }
}

async function main() {
    const mnemonics = [];
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            mnemonics.push({ stt: row.stt, mnemonic: row.mnemonic }); // Adjust this based on your CSV structure
        })
        .on('end', async () => {
            console.log('CSV file successfully processed. Shuffling and starting transactions...');
            shuffle(mnemonics);
            for (const { stt, mnemonic } of mnemonics) {
                await processMnemonic(stt, mnemonic);
                const delay = Math.random() * (18000 - 6000) + 6000; // Random delay between 6 and 7 seconds
                console.log(`Sleeping for ${delay.toFixed(0)} ms...`);
                await sleep(delay);
            }
            console.log('All transactions processed.');
        })
        .on('error', (error) => {
            console.error("Error reading CSV file:", error);
        });
}

main().catch(console.error);
