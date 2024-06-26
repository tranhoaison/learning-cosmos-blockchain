const fs = require('fs');
const csv = require('csv-parser');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { createObjectCsvWriter } = require('csv-writer');

const csvFilePath = 'seeds.csv'; // Replace with the path to your CSV file
const outputCsvPath = 'output_addresses.csv'; // Output CSV file path

const csvWriter = createObjectCsvWriter({
    path: outputCsvPath,
    header: [
        { id: 'stt', title: 'STT' },
        { id: 'walletAddress', title: 'Wallet Address' }
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

        // Print wallet address
        console.log("Wallet Address:", firstAccount.address);

        // Record the address details
        await csvWriter.writeRecords([{
            stt: stt,
            walletAddress: firstAccount.address,
        }]);

    } catch (error) {
        console.error("Error occurred while processing mnemonic:", error);
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
            console.log('CSV file successfully processed. Starting address generation...');
            for (const { stt, mnemonic } of mnemonics) {
                await processMnemonic(stt, mnemonic);
            }
            console.log('All addresses processed.');
        })
        .on('error', (error) => {
            console.error("Error reading CSV file:", error);
        });
}

main().catch(console.error);
