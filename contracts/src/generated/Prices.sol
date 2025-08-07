// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Auto-generated price constants
// Generated at: 2025-08-14T13:59:12.026Z
// USD Prices: Pro=$3, Enterprise=$5

library Prices {
    // Chain IDs
    uint256 public constant CHAIN_HEDERATESTNET = 296;
    uint256 public constant CHAIN_HEDERAMAINNET = 295;
    uint256 public constant CHAIN_BASESEPOLIA = 84532;

    // Get subscription prices for a specific chain
    function getPrices(uint256 chainId) internal pure returns (uint256 proPrice, uint256 enterprisePrice) {
        if (chainId == 296) {
            // hederaTestnet (HBAR)
            return (1183600038, 1972666730);
        }
        else if (chainId == 295) {
            // hederaMainnet (HBAR)
            return (1183600038, 1972666730);
        }
        else if (chainId == 84532) {
            // baseSepolia (ETH)
            return (649688149688150, 1082813582813583);
        }
        else {
            // Default fallback prices
            revert("Unsupported chain ID");
        }
    }
    
    // Get pro subscription price for a specific chain
    function getProPrice(uint256 chainId) internal pure returns (uint256) {
        (uint256 proPrice, ) = getPrices(chainId);
        return proPrice;
    }
    
    // Get enterprise subscription price for a specific chain
    function getEnterprisePrice(uint256 chainId) internal pure returns (uint256) {
        (, uint256 enterprisePrice) = getPrices(chainId);
        return enterprisePrice;
    }
    
    // Get native currency symbol for a specific chain
    function getNativeCurrencySymbol(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 296) {
            return "HBAR";
        }
        else if (chainId == 295) {
            return "HBAR";
        }
        else if (chainId == 84532) {
            return "ETH";
        }
        else {
            return "NATIVE";
        }
    }
}
