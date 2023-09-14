import { BigNumber } from "ethers";
import { concat } from "ethers/lib/utils";
import { Client, Presets } from "userop";
import {
  BUNDLER_RPC_URL,
  ERC20_ADDRESS,
  WALLET_FACTORY_ADDRESS,
} from "./constants";
import {
  entryPointContract,
  getWalletContract,
  provider,
  walletFactoryContract,
  ERC20ABIContract, // Import your ERC-20 contract here
} from "./getContracts";
import { getUserOperationBuilder } from "./getUserOperationBuilder";

export async function getUserOpForERC20Transfer(
  walletAddress: string,
  owners: string[],
  salt: string,
  toAddress: string,
  amount: BigNumber, // Amount of tokens to transfer
  isDeployed?: boolean
) {
  try {
    let initCode: Uint8Array = new Uint8Array(0); // Initialize the initCode as an empty array

    if (!isDeployed) {
      const data = walletFactoryContract.interface.encodeFunctionData(
        "createAccount",
        [owners, salt]
      );
      initCode = concat([WALLET_FACTORY_ADDRESS, data]);
    }

    const nonce: BigNumber = await entryPointContract.getNonce(
      walletAddress,
      0
    );

    const walletContract = getWalletContract(walletAddress);

    // Encode the ERC-20 token transfer function with the destination address and amount
    const functionData = ERC20ABIContract.interface.encodeFunctionData(
      "transfer",
      [toAddress, amount]
    );

    // Call the correct function on the wallet contract to execute the ERC-20 transfer
    const encodedCallData = walletContract.interface.encodeFunctionData(
      "execute",
      [ERC20_ADDRESS, 0, functionData] // Note: I assumed the third parameter should be zero for gas
    );

    const builder = await getUserOperationBuilder(
      walletContract.address,
      nonce,
      initCode,
      encodedCallData,
      []
    );

    builder.useMiddleware(Presets.Middleware.getGasPrice(provider));

    const client = await Client.init(BUNDLER_RPC_URL);
    await client.buildUserOperation(builder);
    const userOp = builder.getOp();

    return userOp;
  } catch (e) {
    console.error("Error:", e);
    if (e instanceof Error) {
      window.alert("Error: " + e.message);
    }
    // Handle the error appropriately or rethrow it if needed
  }
}
