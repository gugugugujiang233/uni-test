const fs = require("fs");
const yaml = require("js-yaml");
const Web3 = require("web3");
const UniswapV2Factory = require("../artifacts/contracts/Factory.sol/UniswapV2Factory.json");
const Multicall = require("../artifacts/contracts/MultilCall.sol/Multicall.json");
const UniswapV2Router02 = require("../artifacts/contracts/UniswapV2Router02.sol/UniswapV2Router02.json");
const WETH9 = require("../artifacts/contracts/Weth.sol/WETH9.json");
const config = require("./config.json");
const { log } = require("console");
const endpoint = config.node_address;
const hexPrivateKey = config.hex_private_key;

const options = { timeout: 1000 * 30 };
const web3 = new Web3(new Web3.providers.HttpProvider(endpoint, options));
const account = web3.eth.accounts.privateKeyToAccount(hexPrivateKey);

async function sendTransaction(web3, _chainId, account, data, nonce) {
  const tx = {
    nonce: web3.utils.toHex(nonce),
    value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
    gasLimit: web3.utils.toHex(30000000), // 基础交易费用正好是 21000
    gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
    chainId: _chainId,
    data,
  };

  const signedTx = await account.signTransaction(tx);
  return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
}

(async () => {
  const web3 = new Web3(new Web3.providers.HttpProvider(endpoint, options));
  const account = web3.eth.accounts.privateKeyToAccount(hexPrivateKey);

  const chainId = await web3.eth.getChainId();
  let nonce = await web3.eth.getTransactionCount(account.address, 'pending');

  log(await web3.eth.getBalance(account.address))

  const contractAddress = {
    WETH: "",
    WETH_TX_HASH: "",
    UniswapV2Factory: "",
    UniswapV2Factory_TX_HASH: "",
    UniswapV2Router02: "",
    UniswapV2Router02_TX_HASH: "",
    Multicall: "",
    Multicall_TX_HASH: "",
    InitCodeHash:
      "0xfe5c25035eb1580fcbc8496a5d5423870718fac54c9d582b43039dbce6afc72f",
  };

  // 部署 Multicall 合约
  {
    const contract = new web3.eth.Contract(Multicall.abi);
    const data = contract.deploy({ data: Multicall.bytecode }).encodeABI();
    const receipt = await sendTransaction(web3, chainId, account, data, nonce);
    nonce++;
    contractAddress.Multicall = receipt.contractAddress;
    contractAddress.Multicall_TX_HASH = receipt.transactionHash;
  }

  // 部署 WETH 合约
  {
    const contract = new web3.eth.Contract(WETH9.abi);
    const data = contract.deploy({ data: WETH9.bytecode }).encodeABI();
    const receipt = await sendTransaction(web3, chainId, account, data, nonce);
    nonce++;
    contractAddress.WETH = receipt.contractAddress;
    contractAddress.WETH_TX_HASH = receipt.transactionHash;
  }


  // 部署 UniswapV2Factory 合约
  {
    const contract = new web3.eth.Contract(UniswapV2Factory.abi);
    const txOptions = {
      data: UniswapV2Factory.bytecode,
      arguments: [account.address],
    };
    const data = contract.deploy(txOptions).encodeABI();
    const receipt = await sendTransaction(web3, chainId, account, data, nonce);
    nonce++;
    contractAddress.UniswapV2Factory = receipt.contractAddress;
    contractAddress.UniswapV2Factory_TX_HASH = receipt.transactionHash;
  }

  // 部署 UniswapV2Router02 合约
  {
    const contract = new web3.eth.Contract(UniswapV2Router02.abi);
    const txOptions = {
      data: UniswapV2Router02.bytecode,
      arguments: [contractAddress.UniswapV2Factory, contractAddress.WETH],
    };
    const data = contract.deploy(txOptions).encodeABI();
    const receipt = await sendTransaction(web3, chainId, account, data, nonce);
    nonce++;
    contractAddress.UniswapV2Router02 = receipt.contractAddress;
    contractAddress.UniswapV2Router02_TX_HASH = receipt.transactionHash;
  }

  console.log(contractAddress);
  const yamlStr = yaml.dump(contractAddress);
  fs.writeFileSync("contract_Uni_V2_Address.yaml", yamlStr, "utf8");
})();