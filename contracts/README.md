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

# Examples:
./deploy.sh hederaTestnet
./deploy.sh baseSepolia

# Deploy with verification
./deploy.sh <network-name> --verify

# Deploy to all configured networks
./deploy.sh --all

# List available networks
./deploy.sh
```

### Automatic Contract Linking

The deployment scripts automatically:

1. Deploy SubscriptionManager with pricing configuration
2. Deploy EscrowCore with admin as fee recipient
3. Deploy AchievementNFT for gamification
4. **Link EscrowCore with SubscriptionManager** (essential for fee management)

This linking is crucial for EscrowCore to query user fee tiers from
SubscriptionManager.

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

Then regenerate TypeScript bindings:

```bash
npm run prebuild
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

## Contract Architecture

### SubscriptionManager

- Manages subscription plans and pricing
- Stores fee tiers for each plan (in basis points)
- Provides fee query functions for other contracts
- Default fee tiers:
  - Free Plan: 250 basis points (2.5%)
  - Pro Plan: 200 basis points (2.0%)
  - Enterprise Plan: 150 basis points (1.5%)
  - Team Pro: 200 basis points (2.0%)
  - Team Enterprise: 150 basis points (1.5%)

### EscrowCore

- Handles escrow transactions
- Queries SubscriptionManager for user fee tiers
- Must be linked to SubscriptionManager after deployment
- Uses dynamic fee calculation based on user's subscription

### AchievementNFT

- Manages achievement NFTs for gamification
- Independent contract (no linking required)
- Mints NFTs for user achievements and milestones

## Troubleshooting

### "Trading Fee: Not set" in Admin Panel

This indicates EscrowCore is not linked to SubscriptionManager. The deployment
scripts handle this automatically, but if you see this error:

1. Check that both contracts are deployed
2. Verify the linking transaction succeeded
3. Manually link if necessary:
   ```solidity
   // In a Foundry script
   EscrowCore escrowCore = EscrowCore(payable(ESCROW_CORE_ADDRESS));
   escrowCore.setSubscriptionManager(SUBSCRIPTION_MANAGER_ADDRESS);
   ```

### Fee Tiers Not Displaying

Ensure:

1. The `feeTierBasisPoints` field is included in contract queries
2. The API routes are passing the field to the frontend
3. The contracts are properly linked on-chain
4. Run `npm run prebuild` after updating contract addresses
