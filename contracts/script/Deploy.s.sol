// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Universal deployment script for all chains

import "forge-std/Script.sol";
import "../src/SubscriptionManager.sol";
import "../src/EscrowCore.sol";
import "../src/AchievementNFT.sol";
import {Prices} from "../src/generated/Prices.sol";

contract DeployScript is Script {
    function run() external {
        // Get admin address from environment
        address adminAddress = vm.envAddress("ADMIN_ADDRESS");
        
        // Get prices for current chain
        uint256 proPriceWei;
        uint256 enterprisePriceWei;
        
        // Check for environment variable overrides first
        try vm.envUint("PRO_PRICE_WEI") returns (uint256 price) {
            proPriceWei = price;
            console.log("Using environment pro price:", proPriceWei);
        } catch {
            // Use generated prices based on current chain ID
            proPriceWei = Prices.getProPrice(block.chainid);
            console.log("Using generated pro price for chain", block.chainid, ":", proPriceWei);
        }
        
        try vm.envUint("ENTERPRISE_PRICE_WEI") returns (uint256 price) {
            enterprisePriceWei = price;
            console.log("Using environment enterprise price:", enterprisePriceWei);
        } catch {
            // Use generated prices based on current chain ID
            enterprisePriceWei = Prices.getEnterprisePrice(block.chainid);
            console.log("Using generated enterprise price for chain", block.chainid, ":", enterprisePriceWei);
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
        
        // Restart broadcast for next deployment
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
        
        // Stop and restart broadcast to link contracts
        vm.stopBroadcast();
        vm.startBroadcast();
        
        // Link EscrowCore with SubscriptionManager
        // This is required for EscrowCore to query user fee tiers from SubscriptionManager
        console.log("Linking EscrowCore with SubscriptionManager...");
        escrowCore.setSubscriptionManager(address(subscriptionManager));
        console.log("EscrowCore linked to SubscriptionManager successfully!");
        
        vm.stopBroadcast();
        
        // Get native currency symbol from generated Prices library
        string memory nativeCurrency = Prices.getNativeCurrencySymbol(block.chainid);
        
        // Log deployment information
        console.log("================================");
        console.log("All contracts deployed and linked!");
        console.log("SubscriptionManager:", address(subscriptionManager));
        console.log("EscrowCore:", address(escrowCore));
        console.log("  -> Linked to SubscriptionManager");
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