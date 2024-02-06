const { getNamedAccounts, ethers, network } = require("hardhat");
const { getWeth, AMOUNT } = require("./getWeth");
const { networkConfig } = require("../helper-hardhat-config");

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();
  const signer = await ethers.getSigner(deployer);

  // Get Lending Pool
  const lendingPool = await getLendingPool(signer);
  console.log(`LendingPool Address : ${lendingPool.target}`);

  // Approve
  const wethTokenAddress = networkConfig[network.config.chainId]["wethToken"];
  await approveErc20(wethTokenAddress, lendingPool.target, AMOUNT, signer);

  // Deposit
  console.log("-------------------Depositing-------------------");
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("-------------------Deposited!-------------------");

  // Get User Account Data
  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer);

  // Get DAI price from Chainlink protocol
  const daiPrice = await getDaiPrice();
  const amountDaiToBorrow = Number(availableBorrowsETH) * 0.95 * (1 / Number(daiPrice));
  console.log(`You can borrow ${amountDaiToBorrow} DAI`);
  const amountDaiToBorrowWei = ethers.parseEther(amountDaiToBorrow.toString());

  // Borrow
  const daiTokenAddress = networkConfig[network.config.chainId]["daiTokenAddress"];
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);

  // Get User Account Data
  await getBorrowUserData(lendingPool, deployer);

  // Repay
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, signer);

  // Get User Account Data
  await getBorrowUserData(lendingPool, deployer);
}

async function getLendingPool(account) {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    networkConfig[network.config.chainId]["lendingPoolAddressesProvider"],
    account,
  );
  const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account);
  return lendingPool;
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
  const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account);
  const txResponse = await erc20Token.approve(spenderAddress, amountToSpend);
  await txResponse.wait(1);
  console.log("-------------------Approved!-------------------");
}

async function getBorrowUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`You have ${ethers.formatEther(totalCollateralETH)} worth of ETH deposited.`);
  console.log(`You have ${ethers.formatEther(totalDebtETH)} worth of ETH borrowed.`);
  console.log(`You can borrow ${ethers.formatEther(availableBorrowsETH)} worth of ETH.`);
  return { availableBorrowsETH, totalDebtETH };
}

async function getDaiPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    networkConfig[network.config.chainId]["daiEthPriceFeed"],
  );
  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log(`The DAI/ETH price is ${ethers.formatEther(price)}`);
  // console.log(`Decimals: ${await daiEthPriceFeed.decimals()}`);
  return price;
}

async function borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, account) {
  const borrowTx = await lendingPool.borrow(daiTokenAddress, amountDaiToBorrowWei, 2, 0, account);
  await borrowTx.wait(1);
  console.log("----------------You've borrowed!----------------");
}

async function repay(amount, daiTokenAddress, lendingPool, account) {
  // Approve before repaying!
  await approveErc20(daiTokenAddress, lendingPool.target, amount, account);

  const repayTx = await lendingPool.repay(daiTokenAddress, amount, 2, account);
  await repayTx.wait(1);
  console.log("---------------------Repaid!---------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
