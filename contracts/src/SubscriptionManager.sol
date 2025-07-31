// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SubscriptionManager
/// @notice Accepts native currency payments to activate or extend a team's subscription.
contract SubscriptionManager is AccessControl, ReentrancyGuard {
    /* -------------------------------------------------------------------------- */
    /*                                   ROLES                                    */
    /* -------------------------------------------------------------------------- */

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /* -------------------------------------------------------------------------- */
    /*                                 CONSTANTS                                  */
    /* -------------------------------------------------------------------------- */

    /// @dev All plans grant 30 days of service per payment.
    uint256 public constant PERIOD = 30 days;

    /* -------------------------------------------------------------------------- */
    /*                                 STORAGE                                    */
    /* -------------------------------------------------------------------------- */

    /// team wallet → Unix timestamp (seconds) until which the subscription is active
    mapping(address => uint256) private _paidUntil;

    /// planKey (1 = Pro, 2 = Enterprise, others reserved) → price in wei
    mapping(uint8 => uint256) public planPriceWei;

    /// @dev Plan details structure
    struct Plan {
        uint8 planKey;
        string name;
        string displayName;
        string description;
        uint256 priceWei;
        uint256 maxMembers;
        string[] features;
        bool isActive;
        uint256 sortOrder;
        bool isTeamPlan;
    }

    /// @dev planKey → Plan details
    mapping(uint8 => Plan) public plans;

    /// @dev Array of all plan keys for enumeration
    uint8[] public planKeys;

    /// @dev Track if a plan key exists
    mapping(uint8 => bool) public planExists;

    /// @dev Total earnings accumulated from subscription payments
    uint256 public totalEarnings;

    /// @dev Total earnings withdrawn by admin
    uint256 public totalWithdrawn;

    /// @dev Supported ERC20 token addresses for payments
    mapping(address => bool) public supportedTokens;

    /// @dev Token address → total earnings for that token
    mapping(address => uint256) public tokenEarnings;

    /// @dev Token address → total withdrawn for that token
    mapping(address => uint256) public tokenWithdrawn;

    /// @dev Earnings history for tracking individual payments
    struct EarningRecord {
        address payer;
        address team;
        uint8 planKey;
        uint256 amount;
        address token; // address(0) for native currency
        uint256 timestamp;
    }

    /// @dev Array of all earning records
    EarningRecord[] public earningRecords;

    /* -------------------------------------------------------------------------- */
    /*                                   EVENTS                                   */
    /* -------------------------------------------------------------------------- */

    event SubscriptionPaid(address indexed team, uint8 indexed planKey, uint256 paidUntil);
    event EarningsWithdrawn(address indexed to, uint256 amount, address indexed token);
    event TokenSupportUpdated(address indexed token, bool supported);
    event PlanCreated(uint8 indexed planKey, string name, uint256 priceWei);
    event PlanUpdated(uint8 indexed planKey, string name, uint256 priceWei);
    event PlanDeleted(uint8 indexed planKey);

    /* -------------------------------------------------------------------------- */
    /*                                CONSTRUCTOR                                 */
    /* -------------------------------------------------------------------------- */

    /// @param admin         Address receiving DEFAULT_ADMIN_ROLE and ADMIN_ROLE.
    /// @param priceWeiPro  Initial price for the Pro plan (planKey = 1).
    /// @param priceWeiEnterprise  Initial price for the Enterprise plan (planKey = 2).
    constructor(address admin, uint256 priceWeiPro, uint256 priceWeiEnterprise) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);

        planPriceWei[1] = priceWeiPro;
        planPriceWei[2] = priceWeiEnterprise;

        // Initialize default plans
        _createDefaultPlans(priceWeiPro, priceWeiEnterprise);
    }

    /// @dev Initialize default plans during deployment
    function _createDefaultPlans(uint256 priceWeiPro, uint256 priceWeiEnterprise) internal {
        // Free Plan (planKey = 0)
        string[] memory freeFeatures = new string[](3);
        freeFeatures[0] = "2.5% P2P trading fee";
        freeFeatures[1] = "Basic escrow protection";
        freeFeatures[2] = "Community support";
        
        plans[0] = Plan({
            planKey: 0,
            name: "free",
            displayName: "Free",
            description: "Perfect for getting started",
            priceWei: 0,
            maxMembers: 3,
            features: freeFeatures,
            isActive: true,
            sortOrder: 1,
            isTeamPlan: false
        });
        planKeys.push(0);
        planExists[0] = true;

        // Pro Plan (planKey = 1)
        string[] memory proFeatures = new string[](4);
        proFeatures[0] = "2.0% P2P trading fee (20% discount)";
        proFeatures[1] = "Priority dispute resolution";
        proFeatures[2] = "Advanced escrow features";
        proFeatures[3] = "Priority support";
        
        plans[1] = Plan({
            planKey: 1,
            name: "pro",
            displayName: "Pro",
            description: "For growing teams",
            priceWei: priceWeiPro,
            maxMembers: 25,
            features: proFeatures,
            isActive: true,
            sortOrder: 2,
            isTeamPlan: false
        });
        planKeys.push(1);
        planExists[1] = true;

        // Enterprise Plan (planKey = 2)
        string[] memory enterpriseFeatures = new string[](5);
        enterpriseFeatures[0] = "1.5% P2P trading fee (40% discount)";
        enterpriseFeatures[1] = "API access for integrations";
        enterpriseFeatures[2] = "24/7 premium support";
        enterpriseFeatures[3] = "Priority dispute resolution";
        enterpriseFeatures[4] = "Custom smart contract features";
        
        plans[2] = Plan({
            planKey: 2,
            name: "enterprise",
            displayName: "Enterprise",
            description: "For large organizations",
            priceWei: priceWeiEnterprise,
            maxMembers: type(uint256).max, // Unlimited
            features: enterpriseFeatures,
            isActive: true,
            sortOrder: 3,
            isTeamPlan: false
        });
        planKeys.push(2);
        planExists[2] = true;
        
        // Team Pro Plan (planKey = 3)
        string[] memory teamProFeatures = new string[](5);
        teamProFeatures[0] = "2.0% P2P trading fee for all members";
        teamProFeatures[1] = "Shared escrow management";
        teamProFeatures[2] = "Team dispute resolution";
        teamProFeatures[3] = "Consolidated billing";
        teamProFeatures[4] = "Team activity tracking";
        
        plans[3] = Plan({
            planKey: 3,
            name: "team_pro",
            displayName: "Team Pro",
            description: "Pro features for your entire team",
            priceWei: priceWeiPro * 3, // 3x individual price
            maxMembers: 25,
            features: teamProFeatures,
            isActive: true,
            sortOrder: 4,
            isTeamPlan: true
        });
        planKeys.push(3);
        planExists[3] = true;
        planPriceWei[3] = priceWeiPro * 3;
        
        // Team Enterprise Plan (planKey = 4)
        string[] memory teamEnterpriseFeatures = new string[](6);
        teamEnterpriseFeatures[0] = "1.5% P2P trading fee for all members";
        teamEnterpriseFeatures[1] = "Unlimited team members";
        teamEnterpriseFeatures[2] = "Team API access";
        teamEnterpriseFeatures[3] = "White-label options";
        teamEnterpriseFeatures[4] = "Dedicated team support";
        teamEnterpriseFeatures[5] = "Custom contract deployment";
        
        plans[4] = Plan({
            planKey: 4,
            name: "team_enterprise",
            displayName: "Team Enterprise",
            description: "Enterprise features for large teams",
            priceWei: priceWeiEnterprise * 3, // 3x individual price
            maxMembers: type(uint256).max,
            features: teamEnterpriseFeatures,
            isActive: true,
            sortOrder: 5,
            isTeamPlan: true
        });
        planKeys.push(4);
        planExists[4] = true;
        planPriceWei[4] = priceWeiEnterprise * 3;
    }

    /* -------------------------------------------------------------------------- */
    /*                               ADMIN ACTIONS                                */
    /* -------------------------------------------------------------------------- */

    /// @notice Update the wei price for a given plan.
    function setPlanPrice(uint8 planKey, uint256 newPriceWei) external onlyRole(ADMIN_ROLE) {
        require(planExists[planKey], "Subscription: plan does not exist");
        planPriceWei[planKey] = newPriceWei;
        plans[planKey].priceWei = newPriceWei;
        emit PlanUpdated(planKey, plans[planKey].name, newPriceWei);
    }

    /// @notice Create a new subscription plan
    function createPlan(
        uint8 planKey,
        string memory name,
        string memory displayName,
        string memory description,
        uint256 priceWei,
        uint256 maxMembers,
        string[] memory features,
        bool isActive,
        uint256 sortOrder,
        bool isTeamPlan
    ) external onlyRole(ADMIN_ROLE) {
        require(!planExists[planKey], "Subscription: plan already exists");
        require(bytes(name).length > 0, "Subscription: name cannot be empty");
        require(bytes(displayName).length > 0, "Subscription: display name cannot be empty");

        plans[planKey] = Plan({
            planKey: planKey,
            name: name,
            displayName: displayName,
            description: description,
            priceWei: priceWei,
            maxMembers: maxMembers,
            features: features,
            isActive: isActive,
            sortOrder: sortOrder,
            isTeamPlan: isTeamPlan
        });

        planKeys.push(planKey);
        planExists[planKey] = true;
        planPriceWei[planKey] = priceWei;

        emit PlanCreated(planKey, name, priceWei);
    }

    /// @notice Update an existing subscription plan
    function updatePlan(
        uint8 planKey,
        string memory name,
        string memory displayName,
        string memory description,
        uint256 priceWei,
        uint256 maxMembers,
        string[] memory features,
        bool isActive,
        uint256 sortOrder,
        bool isTeamPlan
    ) external onlyRole(ADMIN_ROLE) {
        require(planExists[planKey], "Subscription: plan does not exist");
        require(bytes(name).length > 0, "Subscription: name cannot be empty");
        require(bytes(displayName).length > 0, "Subscription: display name cannot be empty");

        plans[planKey].name = name;
        plans[planKey].displayName = displayName;
        plans[planKey].description = description;
        plans[planKey].priceWei = priceWei;
        plans[planKey].maxMembers = maxMembers;
        plans[planKey].features = features;
        plans[planKey].isActive = isActive;
        plans[planKey].sortOrder = sortOrder;
        plans[planKey].isTeamPlan = isTeamPlan;

        planPriceWei[planKey] = priceWei;

        emit PlanUpdated(planKey, name, priceWei);
    }

    /// @notice Delete a subscription plan
    function deletePlan(uint8 planKey) external onlyRole(ADMIN_ROLE) {
        require(planExists[planKey], "Subscription: plan does not exist");
        require(planKey != 0, "Subscription: cannot delete free plan");

        // Remove from planKeys array
        for (uint256 i = 0; i < planKeys.length; i++) {
            if (planKeys[i] == planKey) {
                planKeys[i] = planKeys[planKeys.length - 1];
                planKeys.pop();
                break;
            }
        }

        delete plans[planKey];
        delete planPriceWei[planKey];
        planExists[planKey] = false;

        emit PlanDeleted(planKey);
    }

    /// @notice Add or remove support for an ERC20 token
    function setSupportedToken(address token, bool supported) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "Subscription: invalid token address");
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    /// @notice Withdraw native currency earnings to specified address
    function withdrawEarnings(address payable to, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(to != address(0), "Subscription: invalid withdrawal address");
        require(amount > 0, "Subscription: withdrawal amount must be positive");
        
        uint256 available = totalEarnings - totalWithdrawn;
        require(amount <= available, "Subscription: insufficient earnings");
        
        totalWithdrawn += amount;
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Subscription: withdrawal failed");
        
        emit EarningsWithdrawn(to, amount, address(0));
    }

    /// @notice Withdraw ERC20 token earnings to specified address
    function withdrawTokenEarnings(address token, address to, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(token != address(0), "Subscription: invalid token address");
        require(to != address(0), "Subscription: invalid withdrawal address");
        require(amount > 0, "Subscription: withdrawal amount must be positive");
        
        uint256 available = tokenEarnings[token] - tokenWithdrawn[token];
        require(amount <= available, "Subscription: insufficient token earnings");
        
        tokenWithdrawn[token] += amount;
        
        IERC20(token).transfer(to, amount);
        
        emit EarningsWithdrawn(to, amount, token);
    }

    /* -------------------------------------------------------------------------- */
    /*                           P U B L I C  A C T I O N                          */
    /* -------------------------------------------------------------------------- */

    /**
     * @dev Pay exactly the plan price in wei to activate or extend a subscription.
     *      If the team is already active, the new period is appended to the current
     *      expiry; otherwise it starts from `block.timestamp`.
     *
     * @param team     Wallet that owns the Team (can differ from `msg.sender`).
     * @param planKey  Pricing tier identifier (1 = Pro, 2 = Enterprise).
     */
    function paySubscription(address team, uint8 planKey) external payable {
        uint256 price = planPriceWei[planKey];
        require(price > 0, "Subscription: unknown plan");
        require(msg.value == price, "Subscription: incorrect payment");

        uint256 startTime = _paidUntil[team] > block.timestamp ? _paidUntil[team] : block.timestamp;
        uint256 newExpiry = startTime + PERIOD;
        _paidUntil[team] = newExpiry;

        // Track earnings
        totalEarnings += msg.value;
        
        // Record the earning
        earningRecords.push(EarningRecord({
            payer: msg.sender,
            team: team,
            planKey: planKey,
            amount: msg.value,
            token: address(0), // native currency
            timestamp: block.timestamp
        }));

        emit SubscriptionPaid(team, planKey, newExpiry);
    }

    /**
     * @dev Pay for subscription using ERC20 tokens
     * @param team     Wallet that owns the Team (can differ from `msg.sender`).
     * @param planKey  Pricing tier identifier (1 = Pro, 2 = Enterprise).
     * @param token    Address of the ERC20 token to use for payment
     * @param amount   Amount of tokens to pay
     */
    function paySubscriptionWithToken(address team, uint8 planKey, address token, uint256 amount) external {
        require(supportedTokens[token], "Subscription: token not supported");
        uint256 price = planPriceWei[planKey];
        require(price > 0, "Subscription: unknown plan");
        require(amount == price, "Subscription: incorrect payment");

        uint256 startTime = _paidUntil[team] > block.timestamp ? _paidUntil[team] : block.timestamp;
        uint256 newExpiry = startTime + PERIOD;
        _paidUntil[team] = newExpiry;

        // Track token earnings
        tokenEarnings[token] += amount;
        
        // Record the earning
        earningRecords.push(EarningRecord({
            payer: msg.sender,
            team: team,
            planKey: planKey,
            amount: amount,
            token: token,
            timestamp: block.timestamp
        }));

        // Transfer tokens from user to contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        emit SubscriptionPaid(team, planKey, newExpiry);
    }

    /* -------------------------------------------------------------------------- */
    /*                                   VIEWS                                    */
    /* -------------------------------------------------------------------------- */

    /// @return Unix timestamp until which the subscription is active (0 if never paid)
    function paidUntil(address team) external view returns (uint256) {
        return _paidUntil[team];
    }

    /// @return Available earnings for native currency
    function getAvailableEarnings() external view returns (uint256) {
        return totalEarnings - totalWithdrawn;
    }

    /// @return Available earnings for a specific token
    function getAvailableTokenEarnings(address token) external view returns (uint256) {
        return tokenEarnings[token] - tokenWithdrawn[token];
    }

    /// @return Total number of earning records
    function getEarningRecordsCount() external view returns (uint256) {
        return earningRecords.length;
    }

    /// @return Earning record at specific index
    function getEarningRecord(uint256 index) external view returns (EarningRecord memory) {
        require(index < earningRecords.length, "Subscription: index out of bounds");
        return earningRecords[index];
    }

    /// @return Multiple earning records within a range
    function getEarningRecords(uint256 startIndex, uint256 endIndex) external view returns (EarningRecord[] memory) {
        require(startIndex <= endIndex, "Subscription: invalid range");
        require(endIndex < earningRecords.length, "Subscription: end index out of bounds");
        
        uint256 length = endIndex - startIndex + 1;
        EarningRecord[] memory records = new EarningRecord[](length);
        
        for (uint256 i = 0; i < length; i++) {
            records[i] = earningRecords[startIndex + i];
        }
        
        return records;
    }

    /// @notice Get earnings summary with totals and available amounts
    /// @return totalNativeEarnings Total native currency earnings
    /// @return totalNativeWithdrawn Total native currency withdrawn
    /// @return availableNativeEarnings Available native currency for withdrawal
    /// @return recordsCount Total number of earning records
    function getEarningsSummary() external view returns (
        uint256 totalNativeEarnings,
        uint256 totalNativeWithdrawn,
        uint256 availableNativeEarnings,
        uint256 recordsCount
    ) {
        return (
            totalEarnings,
            totalWithdrawn,
            totalEarnings - totalWithdrawn,
            earningRecords.length
        );
    }

    /// @notice Get all plan keys
    /// @return Array of all existing plan keys
    function getAllPlanKeys() external view returns (uint8[] memory) {
        return planKeys;
    }

    /// @notice Get plan details by plan key
    /// @param planKey The plan key to retrieve
    /// @return Plan details
    function getPlan(uint8 planKey) external view returns (Plan memory) {
        require(planExists[planKey], "Subscription: plan does not exist");
        return plans[planKey];
    }

    /// @notice Get all active plans
    /// @return Array of all active plans
    function getAllActivePlans() external view returns (Plan[] memory) {
        uint256 activeCount = 0;
        
        // Count active plans
        for (uint256 i = 0; i < planKeys.length; i++) {
            if (plans[planKeys[i]].isActive) {
                activeCount++;
            }
        }
        
        Plan[] memory activePlans = new Plan[](activeCount);
        uint256 index = 0;
        
        // Fill active plans array
        for (uint256 i = 0; i < planKeys.length; i++) {
            if (plans[planKeys[i]].isActive) {
                activePlans[index] = plans[planKeys[i]];
                index++;
            }
        }
        
        return activePlans;
    }

    /// @notice Get all plans (active and inactive)
    /// @return Array of all plans
    function getAllPlans() external view returns (Plan[] memory) {
        Plan[] memory allPlans = new Plan[](planKeys.length);
        
        for (uint256 i = 0; i < planKeys.length; i++) {
            allPlans[i] = plans[planKeys[i]];
        }
        
        return allPlans;
    }

    /// @notice Check if a plan exists
    /// @param planKey The plan key to check
    /// @return Whether the plan exists
    function planExistsCheck(uint8 planKey) external view returns (bool) {
        return planExists[planKey];
    }

    /// @notice Get plan features for a specific plan
    /// @param planKey The plan key
    /// @return Array of feature strings
    function getPlanFeatures(uint8 planKey) external view returns (string[] memory) {
        require(planExists[planKey], "Subscription: plan does not exist");
        return plans[planKey].features;
    }

    /* -------------------------------------------------------------------------- */
    /*                                ERC-165                                     */
    /* -------------------------------------------------------------------------- */

    function supportsInterface(bytes4 id) public view override returns (bool) {
        return super.supportsInterface(id) || id == type(IERC165).interfaceId;
    }
}