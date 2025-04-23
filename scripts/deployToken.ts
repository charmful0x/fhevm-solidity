import * as hre from 'hardhat';

async function main() {
  console.log('Deploying EncryptedERC20...');

  const EncryptedERC20 = await hre.ethers.getContractFactory('examples/EncryptedERC20.sol:EncryptedERC20');
  const token = await EncryptedERC20.deploy('test', 'test');
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log('EncryptedERC20 deployed to:', address);

  // Mint initial supply
  const mintAmount = 1000000n;
  const mintTx = await token.mint(mintAmount);
  await mintTx.wait();
  console.log(`Minted ${mintAmount} tokens to deployer`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
