const networkConfig = {
  31337: {
    name: "localhost",
    wethToken: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    lendingPoolAddressesProvider: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    daiEthPriceFeed: "0x773616E4d11A78F511299002da57A0a94577F1f4",
    daiTokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
};
