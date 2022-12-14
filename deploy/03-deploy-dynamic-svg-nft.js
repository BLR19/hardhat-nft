const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    log("___________________________________")

    // address priceFeedAddress,
    // string memory lowSvg,
    // string memory highSvg

    let ethUsdPriceFeedAddress
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    const lowSvgLocation = await fs.readFileSync("./images/dynamic/frown.svg", {
        encoding: "utf8",
    })
    const highSvgLocation = await fs.readFileSync(
        "./images/dynamic/happy.svg",
        { encoding: "utf8" }
    )

    const args = [ethUsdPriceFeedAddress, lowSvgLocation, highSvgLocation]
    const dynamicSvgNft = await deploy("DynamicSvgNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: networkConfig[chainId]["blockConfirmations"] || 1,
    })
    log("___________________________________")

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying...")
        await verify(dynamicSvgNft.address, args)
    }
    log("___________________________________")
}

module.exports.tags = ["all", "dynamicsvgnft", "main"]
