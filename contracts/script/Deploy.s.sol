// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Foundry deployment script for all platform contracts
// This is a Solidity script that runs with `forge script`
// Configuration is read from BLOCKCHAIN_CONFIG env var

import "forge-std/Script.sol";
import "../src/SubscriptionManager.sol";
import "../src/EscrowCore.sol";
import "../src/AchievementNFT.sol";

contract DeployScript is Script {
    function run() external {
        // Get admin address from environment
        address adminAddress = vm.envAddress("ADMIN_ADDRESS");
        
        // For pricing, check env vars first, then use defaults
        uint256 proPriceWei;
        uint256 enterprisePriceWei;
        
        try vm.envUint("PRO_PRICE_WEI") returns (uint256 price) {
            proPriceWei = price;
        } catch {
            // Default prices in wei (roughly $3 and $5 in ETH)
            proPriceWei = 0.001 ether;
            console.log("Using default pro price:", proPriceWei);
        }
        
        try vm.envUint("ENTERPRISE_PRICE_WEI") returns (uint256 price) {
            enterprisePriceWei = price;
        } catch {
            // Default prices in wei
            enterprisePriceWei = 0.002 ether;
            console.log("Using default enterprise price:", enterprisePriceWei);
        }
        
        // Get deployer private key - handled by deploy.sh script
        vm.startBroadcast();
        
        // Deploy SubscriptionManager
        SubscriptionManager subscriptionManager = new SubscriptionManager(
            adminAddress,
            proPriceWei,
            enterprisePriceWei
        );
        
        // Deploy EscrowCore (with admin as fee recipient)
        EscrowCore escrowCore = new EscrowCore(adminAddress);
        
        // Deploy AchievementNFT
        AchievementNFT achievementNFT = new AchievementNFT();
        
        vm.stopBroadcast();
        
        // Get native currency symbol from environment (if available)
        string memory nativeCurrency = "ETH";
        try vm.envString("NATIVE_CURRENCY_SYMBOL") returns (string memory symbol) {
            nativeCurrency = symbol;
        } catch {
            // Default to ETH if not set
        }
        
        // Log deployment information
        console.log("================================");
        console.log("All contracts deployed!");
        console.log("SubscriptionManager:", address(subscriptionManager));
        console.log("EscrowCore:", address(escrowCore));
        console.log("AchievementNFT:", address(achievementNFT));
        console.log("Admin:", adminAddress);
        console.log(string(abi.encodePacked("Pro price (wei):", " ")), proPriceWei);
        console.log(string(abi.encodePacked("Enterprise price (wei):", " ")), enterprisePriceWei);
        console.log(string(abi.encodePacked("Native Currency: ", nativeCurrency)));
        console.log("Chain ID:", block.chainid);
        console.log("================================");
        
        // Save deployment info with proper formatting
        string memory deploymentInfo = string(abi.encodePacked(
            '{\n',
            '  "subscriptionManager": "', vm.toString(address(subscriptionManager)), '",\n',
            '  "escrowCore": "', vm.toString(address(escrowCore)), '",\n',
            '  "achievementNFT": "', vm.toString(address(achievementNFT)), '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "adminAddress": "', vm.toString(adminAddress), '",\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "blockNumber": ', vm.toString(block.number), '\n',
            '}'
        ));
        
        string memory filename = string(abi.encodePacked("deployments/", vm.toString(block.chainid), "-latest.json"));
        vm.writeFile(filename, deploymentInfo);
        
        // Log deployment address for manual recording
        console.log("");
        console.log("IMPORTANT: Deployment saved to:", filename);
        console.log("Contract Addresses:");
        console.log("  SubscriptionManager:", address(subscriptionManager));
        console.log("  EscrowCore:", address(escrowCore));
        console.log("  AchievementNFT:", address(achievementNFT));
        console.log("");
        console.log("Update blockchains.yaml with:");
        console.log("contractAddresses:");
        console.log("  subscriptionManager:", vm.toString(address(subscriptionManager)));
        console.log("  escrowCore:", vm.toString(address(escrowCore)));
        console.log("  achievementNFT:", vm.toString(address(achievementNFT)));
    }
}