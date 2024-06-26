const fs = require("fs");
const csv = require("csv-parser");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningStargateClient } = require("@cosmjs/stargate");
const { coins } = require("@cosmjs/proto-signing");
const _ = require("lodash");

const rpcEndpoint = "rpc_url"; // MantraChain's RPC endpoint
const csvFilePath = "delegate.csv"; // Path to the CSV file

function getRandomAmount(min, max) {
    return (Math.random() * (max - min) + min).toFixed(6); // 6 decimal places to match typical token precision
}

function getRandomDelay(minSeconds, maxSeconds) {
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000; // Convert to milliseconds
}

async function delegate(mnemonic, validatorAddress) {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "mantra", // MantraChain's address prefix
    });
    const [firstAccount] = await wallet.getAccounts();

    const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);

    const randomAmount = getRandomAmount(0.01, 0.02);
    const amount = {
        amount: (randomAmount * 1000000).toString(), // Convert to micro-units
        denom: "uom", // MantraChain's denomination
    };

    const msg = {
        typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
        value: {
            delegatorAddress: firstAccount.address,
            validatorAddress: validatorAddress,
            amount: amount,
        },
    };

    const fee = {
        amount: coins(100, "uom"), // Fee in MantraChain's denomination
        gas: "200000",
    };

    const result = await client.signAndBroadcast(firstAccount.address, [msg], fee, "Delegate tokens to validator");

    if (result.code !== undefined && result.code !== 0) {
        throw new Error(`Error: ${result.log || result.rawLog}`);
    }

    console.log(`Transaction successful for ${firstAccount.address}:`, result.transactionHash);
}

async function readCSVAndDelegate() {
    const entries = [];

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (data) => entries.push(data))
        .on("end", async () => {
            const shuffledEntries = _.shuffle(entries);

            for (const entry of shuffledEntries) {
                const { seedphrase, MantraChain_validator_address: validatorAddress } = entry;
                try {
                    await delegate(seedphrase, validatorAddress);
                } catch (error) {
                    console.error(`Failed to delegate for validator ${validatorAddress}:`, error);
                }

                const delay = getRandomDelay(40, 70);
                console.log(`Waiting for ${delay / 1000} seconds before the next transaction...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        });
}

readCSVAndDelegate();
