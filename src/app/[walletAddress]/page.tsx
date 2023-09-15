"use client";
import Button from "@/components/button";
import TransactionsList from "@/components/transactionList";
import { getUserOpForETHTransfer } from "@/utils/getUserOpForETHTransfer";
import { getUserOpForERC20Transfer } from "@/utils/getUserOperationForERC20Transfer";
import getUserOpHash from "@/utils/getUserOpHash";
import { parseEther } from "ethers/lib/utils";
import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BigNumber } from "ethers";

export default function WalletPage({
  params: { walletAddress },
}: {
  params: { walletAddress: string };
}) {
  const { address: userAddress } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const [receiverAddress, setReceiverAddress] = useState("");
  const [tokenAmount, setTokenAmount] = useState<BigNumber>(BigNumber.from(0));

  const [loading, setLoading] = useState(false);
  const [erc20loading, seterc20Loading] = useState(false);

  const fetchUserOp = async () => {
    try {
      const response = await fetch(
        `/api/fetch-wallet?walletAddress=${walletAddress}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const amountBigInt = parseEther(amount.toString());
      const userOp = await getUserOpForETHTransfer(
        walletAddress,
        data.signers,
        data.salt,
        toAddress,
        amountBigInt,
        data.isDeployed
      );

      if (!userOp) throw new Error("Could not get user operation");

      return userOp;
    } catch (e: any) {
      window.alert(e.message);
      throw new Error(e.message);
    }
  };

  const fetchUserOpERC20 = async () => {
    try {
      const response = await fetch(
        `/api/fetch-wallet?walletAddress=${walletAddress}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const userOp = await getUserOpForERC20Transfer(
        walletAddress,
        data.signers,
        data.salt,
        receiverAddress,
        tokenAmount, // This is a BigNumber
        data.isDeployed
      );

      if (!userOp) throw new Error("Could not get user operation");

      return userOp;
    } catch (e: any) {
      window.alert(e.message);
      throw new Error(e.message);
    }
  };

  const createTransaction = async () => {
    try {
      setLoading(true);
      if (!userAddress) throw new Error("Could not get user address");
      if (!walletClient) throw new Error("Could not get wallet client");

      const userOp = await fetchUserOp();
      if (!userOp) throw new Error("Could not fetch userOp");

      const userOpHash = await getUserOpHash(userOp);
      const signature = await walletClient.signMessage({
        message: { raw: userOpHash as `0x${string}` },
      });

      const response = await fetch("/api/create-transaction", {
        method: "POST",
        body: JSON.stringify({
          walletAddress,
          userOp,
          signature,
          signerAddress: userAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      window.alert(
        "ETH Transaction created and signed! Please ask other owners to sign to finally execute the transaction"
      );
      window.location.reload();
    } catch (err) {
      if (err instanceof Error) window.alert(err.message);
      console.error(err);
      setLoading(false);
    }
  };

  const createERC20Transaction = async () => {
    try {
      seterc20Loading(true);
      if (!userAddress) throw new Error("Could not get user address");
      if (!walletClient) throw new Error("Could not get wallet client");

      const userOp = await fetchUserOpERC20();
      if (!userOp) throw new Error("Could not fetch userOp");

      const userOpHash = await getUserOpHash(userOp);
      const signature = await walletClient.signMessage({
        message: { raw: userOpHash as `0x${string}` },
      });

      console.log(signature);
      
      const response = await fetch("/api/create-erc20transaction", {
        method: "POST",
        body: JSON.stringify({
          walletAddress,
          userOp,
          signature,
          signerAddress: userAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      window.alert(
        "ERC20 Transaction created and signed! Please ask other owners to sign to finally execute the transaction"
      );
      window.location.reload();
    } catch (err) {
      if (err instanceof Error) window.alert(err.message);
      console.error(err);
      seterc20Loading(false);
    }
  };

  return (
    <div className="flex flex-col py-6 items-center gap-5">
      <h1 className="text-5xl font-bold">Manage Wallet</h1>
      <h3 className="text-xl font-medium border-b border-gray-700">
        {walletAddress}
      </h3>

      <div className="text-lg font-bold">Send ETH</div>

      <input
        className="rounded-lg p-2 text-slate-700"
        placeholder="0x0"
        onChange={(e) => setToAddress(e.target.value)}
      />
      <input
        className="rounded-lg p-2 text-slate-700"
        type="number"
        placeholder="1"
        onChange={(e) => {
          if (e.target.value === "") {
            setAmount(0);
            return;
          }
          setAmount(parseFloat(e.target.value));
        }}
      />

      <Button isLoading={loading} onClick={createTransaction}>
        Create ETH Txn
      </Button>

      <div className="box-border rounded-sm bg-slate-400">
        <div>Send ERC20</div>
        <input
          className="rounded-lg p-2 text-slate-700"
          placeholder="0x0"
          onChange={(e) => setReceiverAddress(e.target.value)}
        />
        <input
          className="rounded-lg p-2 text-slate-700"
          type="number"
          placeholder="1"
          onChange={(e) => {
            if (e.target.value === "") {
              setTokenAmount(BigNumber.from(0));
              return;
            }
            setTokenAmount(BigNumber.from(e.target.value));
          }}
        />

        <Button isLoading={erc20loading} onClick={createERC20Transaction}>
          Transfer ERC20
        </Button>
      </div>

      {userAddress && (
        <TransactionsList address={userAddress} walletAddress={walletAddress} />
      )}
    </div>
  );
}
