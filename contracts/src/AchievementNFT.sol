// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract AchievementNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint256 private _tokenIdCounter;
    
    enum AchievementCategory {
        TRADING,
        VOLUME,
        BATTLE,
        COMMUNITY,
        SPECIAL
    }
    
    enum AchievementRarity {
        COMMON,
        UNCOMMON,
        RARE,
        EPIC,
        LEGENDARY
    }
    
    struct Achievement {
        string id;
        string name;
        string description;
        AchievementCategory category;
        AchievementRarity rarity;
        uint256 xpReward;
        uint256 combatPowerReward;
        bool exists;
        bool active;
        string metadataURI;
    }
    
    mapping(string => Achievement) public achievements;
    mapping(address => mapping(string => uint256)) public userAchievements;
    mapping(uint256 => string) public tokenAchievementId;
    mapping(address => uint256) public userTotalXP;
    mapping(address => uint256) public userTotalCombatPower;
    mapping(address => uint256[]) private userTokens;
    
    // Achievement milestones tracking
    mapping(address => mapping(string => uint256)) public userProgress;
    mapping(string => uint256) public achievementRequirements;
    
    // Category tracking for production
    mapping(AchievementCategory => string[]) private achievementsByCategory;
    string[] private allAchievementIds;
    uint256 private totalAchievementTypes;
    
    event AchievementMinted(
        address indexed user,
        string indexed achievementId,
        uint256 tokenId,
        uint256 xpReward,
        uint256 combatPowerReward,
        uint256 timestamp
    );
    
    event AchievementCreated(
        string indexed achievementId,
        string name,
        AchievementCategory category,
        AchievementRarity rarity
    );
    
    event AchievementProgressUpdated(
        address indexed user,
        string indexed achievementId,
        uint256 progress,
        uint256 requirement
    );
    
    event RewardsGranted(
        address indexed user,
        uint256 xpAmount,
        uint256 combatPowerAmount
    );
    
    constructor() ERC721("Achievement NFT", "ACHIEVE") Ownable(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }
    
    function createAchievement(
        string memory achievementId,
        string memory name,
        string memory description,
        AchievementCategory category,
        AchievementRarity rarity,
        uint256 xpReward,
        uint256 combatPowerReward,
        uint256 requirement,
        string memory metadataURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!achievements[achievementId].exists, "Achievement already exists");
        require(bytes(achievementId).length > 0, "Achievement ID cannot be empty");
        require(bytes(name).length > 0, "Name cannot be empty");
        
        achievements[achievementId] = Achievement({
            id: achievementId,
            name: name,
            description: description,
            category: category,
            rarity: rarity,
            xpReward: xpReward,
            combatPowerReward: combatPowerReward,
            exists: true,
            active: true,
            metadataURI: metadataURI
        });
        
        if (requirement > 0) {
            achievementRequirements[achievementId] = requirement;
        }
        
        // Track achievement in category mapping
        achievementsByCategory[category].push(achievementId);
        allAchievementIds.push(achievementId);
        totalAchievementTypes++;
        
        emit AchievementCreated(achievementId, name, category, rarity);
    }
    
    function mintAchievement(
        address user,
        string memory achievementId
    ) public onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        Achievement memory achievement = achievements[achievementId];
        require(achievement.exists, "Achievement does not exist");
        require(achievement.active, "Achievement is not active");
        require(!hasAchievement(user, achievementId), "User already has this achievement");
        
        // Check if user meets requirements
        uint256 requirement = achievementRequirements[achievementId];
        if (requirement > 0) {
            require(userProgress[user][achievementId] >= requirement, "User has not met requirements");
        }
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(user, tokenId);
        _setTokenURI(tokenId, achievement.metadataURI);
        
        userAchievements[user][achievementId] = tokenId;
        tokenAchievementId[tokenId] = achievementId;
        userTokens[user].push(tokenId);
        
        // Grant rewards
        if (achievement.xpReward > 0 || achievement.combatPowerReward > 0) {
            userTotalXP[user] += achievement.xpReward;
            userTotalCombatPower[user] += achievement.combatPowerReward;
            emit RewardsGranted(user, achievement.xpReward, achievement.combatPowerReward);
        }
        
        emit AchievementMinted(
            user, 
            achievementId, 
            tokenId, 
            achievement.xpReward,
            achievement.combatPowerReward,
            block.timestamp
        );
        
        return tokenId;
    }
    
    function batchMintAchievements(
        address user,
        string[] memory achievementIds
    ) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](achievementIds.length);
        
        for (uint256 i = 0; i < achievementIds.length; i++) {
            tokenIds[i] = mintAchievement(user, achievementIds[i]);
        }
        
        return tokenIds;
    }
    
    function updateUserProgress(
        address user,
        string memory achievementId,
        uint256 progress
    ) external onlyRole(MINTER_ROLE) {
        require(achievements[achievementId].exists, "Achievement does not exist");
        require(!hasAchievement(user, achievementId), "User already has this achievement");
        
        userProgress[user][achievementId] = progress;
        uint256 requirement = achievementRequirements[achievementId];
        
        emit AchievementProgressUpdated(user, achievementId, progress, requirement);
        
        // Auto-mint if requirement is met
        if (requirement > 0 && progress >= requirement) {
            mintAchievement(user, achievementId);
        }
    }
    
    function incrementUserProgress(
        address user,
        string memory achievementId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        require(achievements[achievementId].exists, "Achievement does not exist");
        require(!hasAchievement(user, achievementId), "User already has this achievement");
        
        uint256 currentProgress = userProgress[user][achievementId];
        uint256 newProgress = currentProgress + amount;
        userProgress[user][achievementId] = newProgress;
        
        uint256 requirement = achievementRequirements[achievementId];
        emit AchievementProgressUpdated(user, achievementId, newProgress, requirement);
        
        // Auto-mint if requirement is met
        if (requirement > 0 && newProgress >= requirement) {
            mintAchievement(user, achievementId);
        }
    }
    
    function hasAchievement(
        address user,
        string memory achievementId
    ) public view returns (bool) {
        return userAchievements[user][achievementId] > 0;
    }
    
    function getUserAchievementToken(
        address user,
        string memory achievementId
    ) external view returns (uint256) {
        return userAchievements[user][achievementId];
    }
    
    function getUserAchievements(address user) external view returns (uint256[] memory) {
        return userTokens[user];
    }
    
    function getUserAchievementDetails(address user, uint256 tokenId) 
        external 
        view 
        returns (Achievement memory) 
    {
        require(ownerOf(tokenId) == user, "User does not own this token");
        string memory achievementId = tokenAchievementId[tokenId];
        return achievements[achievementId];
    }
    
    function getAchievementsByCategory(AchievementCategory category) 
        external 
        view
        returns (string[] memory) 
    {
        return achievementsByCategory[category];
    }
    
    /**
     * @dev Get achievement statistics
     * @return totalMinted Total NFTs minted
     * @return uniqueHolders Number of unique NFT holders
     * @return achievementTypes Number of achievement types created
     */
    function getAchievementStats() external view returns (
        uint256 totalMinted,
        uint256 uniqueHolders,
        uint256 achievementTypes
    ) {
        totalMinted = _tokenIdCounter;
        uniqueHolders = 0;
        
        // Count unique holders - this is simplified, consider gas optimization for production
        address[] memory holders = new address[](totalMinted);
        uint256 holderCount = 0;
        
        for (uint256 i = 1; i <= totalMinted; i++) {
            try this.ownerOf(i) returns (address owner) {
                bool isNew = true;
                for (uint256 j = 0; j < holderCount; j++) {
                    if (holders[j] == owner) {
                        isNew = false;
                        break;
                    }
                }
                if (isNew) {
                    holders[holderCount] = owner;
                    holderCount++;
                }
            } catch {
                // Token doesn't exist or was burned
            }
        }
        
        uniqueHolders = holderCount;
        achievementTypes = totalAchievementTypes; // Use the state variable
    }
    
    /**
     * @dev Get recent mints (last 10)
     * @return tokenIds Array of recent token IDs
     * @return recipients Array of recipient addresses
     * @return achievementIds Array of achievement IDs
     * @return timestamps Array of mint timestamps (simplified as block numbers)
     */
    function getRecentMints() external view returns (
        uint256[] memory tokenIds,
        address[] memory recipients,
        string[] memory achievementIds,
        uint256[] memory timestamps
    ) {
        uint256 count = _tokenIdCounter > 10 ? 10 : _tokenIdCounter;
        uint256 startId = _tokenIdCounter > 10 ? _tokenIdCounter - 9 : 1;
        
        tokenIds = new uint256[](count);
        recipients = new address[](count);
        achievementIds = new string[](count);
        timestamps = new uint256[](count);
        
        uint256 index = 0;
        for (uint256 i = startId; i <= _tokenIdCounter && index < count; i++) {
            try this.ownerOf(i) returns (address owner) {
                tokenIds[index] = i;
                recipients[index] = owner;
                achievementIds[index] = tokenAchievementId[i];
                timestamps[index] = block.timestamp; // Simplified - would need event tracking
                index++;
            } catch {
                // Token doesn't exist
            }
        }
        
        // Resize arrays if needed
        if (index < count) {
            assembly {
                mstore(tokenIds, index)
                mstore(recipients, index)
                mstore(achievementIds, index)
                mstore(timestamps, index)
            }
        }
    }
    
    /**
     * @dev Get all achievements with pagination
     * @param offset Starting index
     * @param limit Maximum number of achievements to return
     * @return ids Array of achievement IDs
     * @return names Array of achievement names
     * @return categories Array of achievement categories
     * @return rarities Array of achievement rarities
     * @return actives Array of active status
     * @return total Total number of achievements
     */
    function getAllAchievements(uint256 offset, uint256 limit) external view returns (
        string[] memory ids,
        string[] memory names,
        uint8[] memory categories,
        uint8[] memory rarities,
        bool[] memory actives,
        uint256 total
    ) {
        total = allAchievementIds.length;
        
        if (offset >= total) {
            return (new string[](0), new string[](0), new uint8[](0), new uint8[](0), new bool[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 resultSize = end - offset;
        ids = new string[](resultSize);
        names = new string[](resultSize);
        categories = new uint8[](resultSize);
        rarities = new uint8[](resultSize);
        actives = new bool[](resultSize);
        
        for (uint256 i = 0; i < resultSize; i++) {
            string memory achievementId = allAchievementIds[offset + i];
            Achievement memory achievement = achievements[achievementId];
            
            ids[i] = achievementId;
            names[i] = achievement.name;
            categories[i] = uint8(achievement.category);
            rarities[i] = uint8(achievement.rarity);
            actives[i] = achievement.active;
        }
    }
    
    function updateAchievementMetadata(
        string memory achievementId,
        string memory newMetadataURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(achievements[achievementId].exists, "Achievement does not exist");
        achievements[achievementId].metadataURI = newMetadataURI;
    }
    
    function toggleAchievementActive(
        string memory achievementId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(achievements[achievementId].exists, "Achievement does not exist");
        achievements[achievementId].active = !achievements[achievementId].active;
    }
    
    /**
     * @dev Batch create achievements for efficient deployment
     * @param achievementIds Array of achievement IDs
     * @param names Array of achievement names
     * @param descriptions Array of achievement descriptions
     * @param categories Array of achievement categories
     * @param rarities Array of achievement rarities
     * @param xpRewards Array of XP rewards
     * @param combatPowerRewards Array of combat power rewards
     * @param requirements Array of achievement requirements
     * @param metadataURIs Array of metadata URIs
     */
    function batchCreateAchievements(
        string[] memory achievementIds,
        string[] memory names,
        string[] memory descriptions,
        AchievementCategory[] memory categories,
        AchievementRarity[] memory rarities,
        uint256[] memory xpRewards,
        uint256[] memory combatPowerRewards,
        uint256[] memory requirements,
        string[] memory metadataURIs
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            achievementIds.length == names.length &&
            achievementIds.length == descriptions.length &&
            achievementIds.length == categories.length &&
            achievementIds.length == rarities.length &&
            achievementIds.length == xpRewards.length &&
            achievementIds.length == combatPowerRewards.length &&
            achievementIds.length == requirements.length &&
            achievementIds.length == metadataURIs.length,
            "Array lengths mismatch"
        );
        
        uint256 length = achievementIds.length;
        for (uint256 i = 0; i < length; i++) {
            _createSingleAchievement(
                achievementIds[i],
                names[i],
                descriptions[i],
                categories[i],
                rarities[i],
                xpRewards[i],
                combatPowerRewards[i],
                requirements[i],
                metadataURIs[i]
            );
        }
    }
    
    /**
     * @dev Internal function to create a single achievement
     */
    function _createSingleAchievement(
        string memory achievementId,
        string memory name,
        string memory description,
        AchievementCategory category,
        AchievementRarity rarity,
        uint256 xpReward,
        uint256 combatPowerReward,
        uint256 requirement,
        string memory metadataURI
    ) internal {
        if (!achievements[achievementId].exists && bytes(achievementId).length > 0) {
            achievements[achievementId] = Achievement({
                id: achievementId,
                name: name,
                description: description,
                category: category,
                rarity: rarity,
                xpReward: xpReward,
                combatPowerReward: combatPowerReward,
                exists: true,
                active: true,
                metadataURI: metadataURI
            });
            
            if (requirement > 0) {
                achievementRequirements[achievementId] = requirement;
            }
            
            achievementsByCategory[category].push(achievementId);
            allAchievementIds.push(achievementId);
            totalAchievementTypes++;
            
            emit AchievementCreated(achievementId, name, category, rarity);
        }
    }
    
    /**
     * @dev Get user's achievement statistics
     * @param user Address of the user
     * @return totalAchievements Total achievements earned
     * @return totalXP Total XP earned
     * @return totalCombatPower Total combat power earned
     * @return completionRate Percentage of achievements completed
     */
    function getUserAchievementStats(address user) external view returns (
        uint256 totalAchievements,
        uint256 totalXP,
        uint256 totalCombatPower,
        uint256 completionRate
    ) {
        totalAchievements = userTokens[user].length;
        totalXP = userTotalXP[user];
        totalCombatPower = userTotalCombatPower[user];
        
        if (totalAchievementTypes > 0) {
            completionRate = (totalAchievements * 100) / totalAchievementTypes;
        }
    }
    
    function grantMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
    }
    
    function revokeMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Override functions for multiple inheritance
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 amount) 
        internal 
        override(ERC721, ERC721Enumerable) 
    {
        super._increaseBalance(account, amount);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        pure
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return interfaceId == type(IERC721).interfaceId ||
               interfaceId == type(IERC721Metadata).interfaceId ||
               interfaceId == type(IERC721Enumerable).interfaceId ||
               interfaceId == type(IAccessControl).interfaceId ||
               interfaceId == type(IERC165).interfaceId;
    }
}