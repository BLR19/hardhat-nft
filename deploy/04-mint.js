const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts }) {
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    console.log("___________________________________")

    //Basic NFT
    const basicNft = await ethers.getContract("BasicNft", deployer)
    const basicMintTx = await basicNft.mintNft()
    await basicMintTx.wait(1)
    console.log(`Basic NFT index 0 tokenURI: ${await basicNft.tokenURI(0)}`)

    //Random NFT
    const randomNft = await ethers.getContract("RandomIpfsNft", deployer)
    mintFee = await randomNft.getMintFee()
    const randomMintTx = await randomNft.requestNft({
        value: mintFee.toString(),
    })
    const randomMintTxReceipt = await randomMintTx.wait(1)

    await new Promise(async (resolve, reject) => {
        setTimeout(
            () => reject("Timeout: 'NFTMinted' event did not fire"),
            300000
        ) // 5 minute timeout time
        randomNft.once("NftMinted", async function () {
            resolve()
        })
        if (developmentChains.includes(network.name)) {
            const requestId =
                randomMintTxReceipt.events[1].args[0].toString()
            const VRFCoordinatorV2Mock = await ethers.getContract(
                "VRFCoordinatorV2Mock",
                deployer
            )
            await VRFCoordinatorV2Mock.fulfillRandomWords(
                requestId,
                randomNft.address
            )
        }
    })

    console.log(
        `Random IPFS NFT index 0 tokenURI: ${await randomNft.tokenURI(0)}`
    )

    //Dynamic NFT
    const dynamicNft = await ethers.getContract("DynamicSvgNft", deployer)
    const highValue = ethers.utils.parseEther("100000000") //100,000,000$ /Ether
    const dynamicMintTx = await dynamicNft.mintNft(highValue)
    await dynamicMintTx.wait(1)
    console.log(
        `Dynamic SVG NFT index 0 token URI: ${await dynamicNft.tokenURI(0)}`
    )
}

module.exports.tags = ["all", "mint"]
