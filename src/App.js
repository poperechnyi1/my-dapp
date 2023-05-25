import MetaMaskSDK from "@metamask/sdk";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import "./App.css";

// MetaMask SDK initialization
const MMSDK = new MetaMaskSDK();
const ethereum = MMSDK.getProvider(); // You can also access via window.ethereum

// This app will only work on Sepolia to protect users
const SEPOLIA_CHAIN_ID = "0xAA36A7";

// Faucet contract initialization
const provider = new ethers.providers.Web3Provider(ethereum, "any");
const FAUCET_CONTRACT_ADDRESS = "0x9BdCbC868519Cf2907ECE4E9602346c3fC9e6c8e";
const abi = [
    {
        "inputs": [],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
];
const faucetContract = new ethers.Contract(
  FAUCET_CONTRACT_ADDRESS,
  abi,
  provider.getSigner()
);

function App() {
  // useState hooks to keep track of changing figures
  const [walletBalance, setWalletBalance] = useState(0);
  const [faucetBalance, setFaucetBalance] = useState(0);
  const [buttonText, setButtonText] = useState("Connect");
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [onRightNetwork, setOnRightNetwork] = useState(false);
  // array populated by MetaMask onConnect
  const [accounts, setAccounts] = useState([]);
  const [isConnected, setIsConnected] = useState(
    accounts && accounts.length > 0
  );

  // MetaMask event listeners
  ethereum.on("chainChanged", handleNewNetwork);
  ethereum.on("accountsChanged", (newAccounts) => {
    handleNewAccounts(newAccounts);
    updateBalances();
  });

  // any time accounts changes, toggle state in the Connect button
  useEffect(() => {
    setIsConnected(accounts && accounts.length > 0);
  }, [accounts]);

  useEffect(() => {
    if (isConnected) {
      setButtonText("Connected");
      setButtonDisabled(true);
    } else {
      setButtonText("Connect");
      setButtonDisabled(false);
    }
  }, [isConnected]);

  // any time accounts changes, update the balances by checking blockchain again
  useEffect(() => {
    updateBalances();
  }, [accounts]);

  // helper function to protect users from using the wrong network
  // disables the withdraw/deposit buttons if not on Sepolia
  async function handleNewNetwork() {
    const chainId = await ethereum.request({
      method: "eth_chainId",
    });
    console.log(chainId);
    if (chainId != 0xaa36a7) {
      setOnRightNetwork(false);
    } else {
      setOnRightNetwork(true);
    }
  }

  // uses MM SDK to query latest Faucet and user wallet balance
  async function updateBalances() {
    if (accounts.length > 0) {
      const faucetBalance = await ethereum.request({
        method: "eth_getBalance",
        params: [FAUCET_CONTRACT_ADDRESS, "latest"],
      });
      const walletBalance = await ethereum.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      });
      setFaucetBalance(Number(faucetBalance) / 10 ** 18);
      setWalletBalance(Number(walletBalance) / 10 ** 18);
    }
  }

  // handles user connecting to MetaMask
  // will add Sepolia network if not already a network in MM
  // will switch to Sepolia (bug, can't currently do this)
  async function onClickConnect() {
    try {
      const newAccounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      handleNewAccounts(newAccounts);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }], // Check networks.js for hexadecimal network ids
        });
      } catch (e) {
        if (e.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: SEPOLIA_CHAIN_ID,
                  chainName: "Sepolia Test Network",
                  rpcUrls: [
                    "https://eth-sepolia.g.alchemy.com/v2/amBOEhqEklW5j3LzVerBSnqoV_Wtz-ws",
                  ],
                  nativeCurrency: {
                    name: "Sepolia ETH",
                    symbol: "SEPETH",
                    decimals: 18,
                  },
                  blockExplorerUrls: ["https://sepolia.etherscan.io/"],
                },
              ],
            });
          } catch (e) {
            console.log(e);
          }
        }
      }
      setIsConnected(true);
      handleNewNetwork();
      console.log(onRightNetwork);
    } catch (error) {
      console.error(error);
    }
  }

  // hook to change state
  function handleNewAccounts(newAccounts) {
    setAccounts(newAccounts);
  }

  // withdraws .01 ETH from the faucet
  async function withdrawEther() {
    console.log(ethereum);
    // const provider = await alchemy.

    const tx = await faucetContract.withdraw({
      from: accounts[0],
    });
    await tx.wait();
    updateBalances();
  }

  // deposits .01 ETH to the faucet
  async function depositEther() {
    const signer = await provider.getSigner();

    const tx_params = {
      from: accounts[0],
      to: FAUCET_CONTRACT_ADDRESS,
      value: "10000000000000000",
    };

    const tx = await signer.sendTransaction(tx_params);
    await tx.wait();
    updateBalances();
  }

  return (
    <div className="container">
      <div className="wallet-container">
        <div className="wallet wallet-background">
          <div className="balance-container">
            <h1 className="address-item">My Wallet</h1>
            <p className="balance-item">
              <b>Address:</b> {accounts[0]}
            </p>
            <p className="balance-item">
              <b>Balance:</b> {walletBalance} Ξ
            </p>
            <button
              className="button"
              onClick={onClickConnect}
              disabled={buttonDisabled}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
      <div className="faucet-container">
        <h1 className="title">My Faucet dApp! 🚰</h1>
        <p className="subtitle">
          This faucet allows you or your friends to withdraw .01 SepoliaETH per
          account!
        </p>
        <h2 className="balance-item">Faucet Balance: {faucetBalance}Ξ</h2>
        <div className="button-container">
          <button
            onClick={withdrawEther}
            className="button"
            disabled={!isConnected || !onRightNetwork}
          >
            Withdraw .01 ETH
          </button>
          <button
            onClick={depositEther}
            className="button"
            disabled={!isConnected || !onRightNetwork}
          >
            Deposit .01 ETH
          </button>
        </div>
      </div>
      <div className="footer">
        {isConnected
          ? "Connected to MetaMask ✅"
          : "Not connected to MetaMask ❌"}
      </div>
    </div>
  );
}

export default App;