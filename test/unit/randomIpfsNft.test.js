const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNft Unit Tests", function () {
          let randomIpfsNft, deployer, VRFCoordinatorV2Mock
          const chainId = network.config.chainId

          beforeEach(async function () {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["main"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNft")
              VRFCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              )
              mintFee = await randomIpfsNft.getMintFee()
          })

          describe("Constructor", () => {
              it("initializes the NFT correctly.", async () => {
                  const name = await randomIpfsNft.name()
                  const symbol = await randomIpfsNft.symbol()
                  const tokenCounter = await randomIpfsNft.getTokenCounter()
                  assert.equal(name, "Random IPFS NFT")
                  assert.equal(symbol, "RIN")
                  assert.equal(tokenCounter.toString(), "0")
              })
              it("sets starting values correctly", async function () {
                  const dogTokenUriZero = await randomIpfsNft.getDogTokenUris(0)
                  const isInitialized = await randomIpfsNft.getInitialized()
                  assert(dogTokenUriZero.includes("ipfs://"))
                  assert.equal(isInitialized, true)
              })
          })

          describe("requestNft", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NotEnoughETH"
                  )
              })
              it("reverts if payment amount is less than the mint fee", async function () {
                  await expect(
                      randomIpfsNft.requestNft({
                          value: mintFee.sub(ethers.utils.parseEther("0.001")),
                      })
                  ).to.be.revertedWith("RandomIpfsNft__NotEnoughETH")
              })
              it("emits an event and kicks off a random word request", async function () {
                  await expect(
                      randomIpfsNft.requestNft({ value: mintFee })
                  ).to.emit(randomIpfsNft, "NftRequested")
              })
          })

          describe("fulfillRandomWords", function () {
              it("can only be called after paying fee", async function () {
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(
                          0,
                          randomIpfsNft.address
                      )
                  ).to.be.revertedWith("nonexistent request") //error from VRFCoordinatorV2Mock
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(
                          1,
                          randomIpfsNft.address
                      )
                  ).to.be.revertedWith("nonexistent request")
              })
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              const tokenCounter =
                                  await randomIpfsNft.getTokenCounter()
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const requestNftResponse =
                              await randomIpfsNft.requestNft({
                                  value: mintFee,
                              })
                          const requestNftReceipt =
                              await requestNftResponse.wait(1)
                          await VRFCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfsNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })

          describe("getBreedFromModdedRng", () => {
              it("should return pug if moddedRng < 10", async function () {
                  const expectedValue =
                      await randomIpfsNft.getBreedFromModdedRng(7)
                  assert.equal(0, expectedValue)
              })
              it("should return shiba-inu if moddedRng is between 10 - 39", async function () {
                  const expectedValue =
                      await randomIpfsNft.getBreedFromModdedRng(21)
                  assert.equal(1, expectedValue)
              })
              it("should return st. bernard if moddedRng is between 40 - 99", async function () {
                  const expectedValue =
                      await randomIpfsNft.getBreedFromModdedRng(77)
                  assert.equal(2, expectedValue)
              })
              it("should revert if moddedRng > 99", async function () {
                  await expect(
                      randomIpfsNft.getBreedFromModdedRng(100)
                  ).to.be.revertedWith("RandomIpfsNft__RangeOutOfBounds")
              })
          })
      })
