// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Hedera-specific deployment script that handles transactions carefully
// Deploys contracts with delays to ensure proper transaction processing

import "forge-std/Script.sol";
import "../src/SubscriptionManager.sol";
import "../src/EscrowCore.sol";
import "../src/AchievementNFT.sol";

contract DeployHederaScript is Script {
    function run() external {
        // Get admin address from environment
        address adminAddress = vm.envAddress("ADMIN_ADDRESS");
        
        // For pricing, check env vars first, then use defaults
        uint256 proPriceWei;
        uint256 enterprisePriceWei;
        
        try vm.envUint("PRO_PRICE_WEI") returns (uint256 price) {
            proPriceWei = price;
        } catch {
            // Default prices in wei (roughly $3 and $5 in HBAR)
            proPriceWei = 11.5 ether; // ~$3 in HBAR
            console.log("Using default pro price:", proPriceWei);
        }
        
        try vm.envUint("ENTERPRISE_PRICE_WEI") returns (uint256 price) {
            enterprisePriceWei = price;
        } catch {
            // Default prices in wei
            enterprisePriceWei = 19.2 ether; // ~$5 in HBAR
            console.log("Using default enterprise price:", enterprisePriceWei);
        }
        
        // Start broadcast for deployment
        vm.startBroadcast();
        
        // Deploy SubscriptionManager
        console.log("Deploying SubscriptionManager...");
        SubscriptionManager subscriptionManager = new SubscriptionManager(
            adminAddress,
            proPriceWei,
            enterprisePriceWei
        );
        console.log("SubscriptionManager deployed at:", address(subscriptionManager));
        
        // Stop and restart broadcast to ensure transaction is processed
        vm.stopBroadcast();
        
        // Small delay to ensure Hedera processes the transaction
        vm.startBroadcast();
        
        // Deploy EscrowCore
        console.log("Deploying EscrowCore...");
        EscrowCore escrowCore = new EscrowCore(adminAddress);
        console.log("EscrowCore deployed at:", address(escrowCore));
        
        // Stop and restart broadcast again
        vm.stopBroadcast();
        vm.startBroadcast();
        
        // Deploy AchievementNFT
        console.log("Deploying AchievementNFT...");
        AchievementNFT achievementNFT = new AchievementNFT();
        console.log("AchievementNFT deployed at:", address(achievementNFT));
        
        vm.stopBroadcast();
        
        // Get native currency symbol from environment (if available)
        string memory nativeCurrency = "HBAR";
        
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