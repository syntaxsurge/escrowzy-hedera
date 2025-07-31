# Smart Contracts

This directory contains the smart contracts for this project, built using
Foundry.

## Directory Structure

- `src/` - Smart contract source files
- `script/` - Foundry deployment scripts (Solidity)
- `test/` - Contract tests (Solidity)
- `utils/` - Build and configuration utilities (TypeScript)
- `lib/` - Dependencies installed by Foundry (auto-generated)
- `out/` - Compiled contracts (auto-generated)

## Prerequisites

- [Foundry](https://getfoundry.sh/) installed
- Node.js (for configuration generation)

## Setup

1. Install Foundry:

```bash
brew install libusb
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:

```bash
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

## Configuration System

This project uses a centralized YAML configuration system for blockchain
networks and a `.env` file for sensitive configuration.

### Configuration Files

1. **Blockchain Configuration**: `config/blockchains.yaml` in the project root.

2. **Admin Configuration**: `.env` file in the project root:

```bash
# Admin Configuration (sensitive - do not commit!)
ADMIN_ADDRESS=0x...
ADMIN_PRIVATE_KEY=...
```

**Important**: The `.env` file contains sensitive data (private keys) and is
gitignored. Make sure to set `ADMIN_ADDRESS` and `ADMIN_PRIVATE_KEY` in your
`.env` file before deploying contracts.

### Build Process

The build process automatically generates Foundry configuration from your YAML
file:

```bash
# Build with automatic config generation
./build.sh

# This will:
# 1. Generate foundry.toml with all configured networks
# 2. Generate deploy.sh helper script
# 3. Build the contracts
```

## Building

```bash
# Recommended: use the build script
./build.sh

# Or manually:
forge build
```

## Testing

```bash
forge test
```

## Deployment

### Deploy to a specific network

```bash
# Deploy to any configured network
./deploy.sh <network-name>

# Deploy with verification
./deploy.sh <network-name> --verify

# Deploy to all configured networks
./deploy.sh --all

# List available networks
./deploy.sh
```

### Manual deployment

```bash
# Deploy to a specific network
forge script script/Deploy.s.sol --rpc-url <network-name> --broadcast

# Deploy with verification
forge script script/Deploy.s.sol --rpc-url <network-name> --broadcast --verify
```

### After Deployment

Update your `config/blockchains.yaml` with the deployed contract addresses:

```yaml
chains:
  # ... other config ...
  contractAddresses:
    escrowCore: '0xYourEscrowAddress'
    achievementNFT: '0xYourNFTAddress'
    subscriptionManager: '0xYourSubscriptionAddress'
```

## Adding New Networks

1. Add the network to `config/blockchains.yaml`:

```yaml
chains:
  yourNetwork:
    chainId: 12345
    name: 'Your Network'
    rpcUrl: 'https://your-rpc-url'
    explorerUrl: 'https://your-explorer'
    explorerApiKey: ''
    nativeCurrency:
      name: 'Token'
      symbol: 'TKN'
      decimals: 18
    coingeckoId: 'token-id'
    isTestnet: false
    contractAddresses:
      escrowCore: '0xYourEscrowAddress'
      achievementNFT: '0xYourNFTAddress'
      subscriptionManager: '0xYourSubscriptionAddress'
```

2. Rebuild configuration:

```bash
./build.sh
```

3. Deploy:

```bash
./deploy.sh yourNetwork --verify
```

4. Update the YAML with deployed addresses

## Contract Verification

Contracts are automatically verified during deployment if you use the `--verify`
flag and have explorer API keys configured.

Manual verification:

```bash
forge verify-contract <CONTRACT_ADDRESS> src/SubscriptionManager.sol:SubscriptionManager \
  --chain-id <CHAIN_ID> \
  --constructor-args $(cast abi-encode "constructor(address,uint256,uint256)" <ADMIN> <PRO_PRICE> <ENTERPRISE_PRICE>)
```

## Gas Reports

```bash
forge test --gas-report
```

## Coverage

```bash
forge coverage
```
