import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import dotenv from 'dotenv';
import * as fs from 'fs-extra';
import 'hardhat-deploy';
import 'hardhat-ignore-warnings';
import { HardhatUserConfig, extendProvider } from 'hardhat/config';
import { task } from 'hardhat/config';
import type { NetworkUserConfig } from 'hardhat/types';
import { resolve } from 'path';
import * as path from 'path';

import CustomProvider from './CustomProvider';
import './tasks/accounts';
import './tasks/taskDeploy';
import './tasks/taskUtils';

const NUM_ACCOUNTS = 15;

extendProvider(async (provider, _config, _network) => {
  const newProvider = new CustomProvider(provider);
  return newProvider;
});

task('compile:specific', 'Compiles only the specified contract')
  .addParam('contract', "The contract's path")
  .setAction(async ({ contract }, hre) => {
    // Adjust the configuration to include only the specified contract
    hre.config.paths.sources = contract;
    await hre.run('compile');
  });

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || './.env';
dotenv.config({ path: resolve(__dirname, dotenvConfigPath) });

task('coverage').setAction(async (taskArgs, hre, runSuper) => {
  hre.config.networks.hardhat.allowUnlimitedContractSize = true;
  hre.config.networks.hardhat.blockGasLimit = 1099511627775;

  await runSuper(taskArgs);
});

task('test', async (_taskArgs, hre, runSuper) => {
  if (!fs.existsSync('node_modules/@fhevm/core-contracts/addresses')) {
    fs.mkdirSync('node_modules/@fhevm/core-contracts/addresses');
  }

  const sourceDir = path.resolve(__dirname, 'node_modules/@fhevm/core-contracts/contracts');
  const destinationDir = path.resolve(__dirname, 'fhevmTemp/contracts');
  fs.copySync(sourceDir, destinationDir, { dereference: true });
  const sourceDir2 = path.resolve(__dirname, 'node_modules/@fhevm/core-contracts/addresses');
  const destinationDir2 = path.resolve(__dirname, 'fhevmTemp/addresses');
  fs.copySync(sourceDir2, destinationDir2, { dereference: true });
  const sourceDir3 = path.resolve(__dirname, 'node_modules/@zama-fhe/oracle-solidity/contracts');
  const destinationDir3 = path.resolve(__dirname, 'fhevmTemp/contracts');
  fs.copySync(sourceDir3, destinationDir3, { dereference: true });

  // Run modified test task
  if (hre.network.name === 'hardhat') {
    await hre.run('task:deployAllHostContracts');
  }

  await hre.run('compile:specific', { contract: 'examples' });
  await runSuper();
});

const chainIds = {
  localHostChain: 123456,
  sepolia: 11155111,
  staging: 12345,
  zwsDev: 1337,
  mainnet: 1,
  custom: 9496,
};

function getChainConfig(chain: keyof typeof chainIds): NetworkUserConfig {
  let jsonRpcUrl: string | undefined = process.env.RPC_URL;
  if (!jsonRpcUrl) {
    jsonRpcUrl = 'http://127.0.0.1:8756';
  }
  return {
    accounts: [process.env.PRIVATE_KEY!],
    chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : chainIds[chain],
    url: jsonRpcUrl,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: 'custom',
  namedAccounts: {
    deployer: 0,
  },
  mocha: {
    timeout: 500000,
  },
  gasReporter: {
    currency: 'USD',
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
    src: './contracts',
  },
  networks: {
    hardhat: {
      accounts: {
        count: 20,
        mnemonic: 'test test test test test test test test test test test junk',
        path: "m/44'/60'/0'/0",
      },
    },
    staging: getChainConfig('staging'),
    zwsDev: getChainConfig('zwsDev'),
    sepolia: getChainConfig('sepolia'),
    localHostChain: getChainConfig('localHostChain'),
    mainnet: getChainConfig('mainnet'),
    custom: getChainConfig('custom'),
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './examples',
    tests: './test',
  },
  solidity: {
    version: '0.8.24',
    settings: {
      metadata: {
        bytecodeHash: 'none',
      },
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: 'cancun',
      viaIR: false,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY!,
  },
  warnings: {
    '*': {
      'transient-storage': false,
    },
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v6',
  },
};

export default config;
