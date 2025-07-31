// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EscrowCore
 * @dev Core escrow contract for secure P2P trading with dispute resolution
 */
contract EscrowCore is AccessControl, ReentrancyGuard, Pausable {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    // Escrow status enum
    enum Status {
        CREATED,      // Escrow created, waiting for funding
        FUNDED,       // Buyer has funded the escrow
        DELIVERED,    // Seller claims delivery
        CONFIRMED,    // Buyer confirms receipt
        DISPUTED,     // Dispute raised
        REFUNDED,     // Refunded to buyer
        CANCELLED,    // Cancelled before funding
        COMPLETED     // Funds released to seller
    }

    // Escrow struct
    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        uint256 fee;
        Status status;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 disputeWindow; // Time in seconds for dispute window
        bool feeCollected;
        string metadata; // Optional metadata (IPFS hash, etc.)
        uint256 chainId; // Chain ID for cross-chain tracking
        address[] approvers; // Multi-sig approvers for large amounts
        uint256 approvalsRequired; // Number of approvals needed
        uint256 approvalCount; // Current approval count
        mapping(address => bool) hasApproved; // Track who has approved
    }

    // State variables
    uint256 public nextEscrowId;
    uint256 public baseFeePercentage = 250; // 2.5% = 250 basis points
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public defaultDisputeWindow = 7 days;
    address public feeRecipient;
    uint256 public totalFeesCollected;
    
    // Tiered fee structure based on subscription levels
    uint256 public proTierFeePercentage = 200; // 2.0% for Pro tier
    uint256 public enterpriseTierFeePercentage = 150; // 1.5% for Enterprise tier
    
    // Multi-sig thresholds
    uint256 public multiSigThreshold = 10 ether; // Require multi-sig above this amount
    uint256 public defaultApprovalsRequired = 2; // Default number of approvals
    
    // Template support
    mapping(string => EscrowTemplate) public templates;
    
    struct EscrowTemplate {
        uint256 disputeWindow;
        uint256 feePercentage;
        bool requiresMultiSig;
        uint256 approvalsRequired;
        bool exists;
    }

    // Mappings
    mapping(uint256 => Escrow) public escrows;
    mapping(address => uint256[]) public userEscrows;
    mapping(address => uint256) public userActiveEscrowCount;
    mapping(uint256 => string) public disputeReasons;
    mapping(uint256 => string) public resolutionDetails;
    
    // Subscription tier mapping (set by external contract or admin)
    mapping(address => uint8) public userSubscriptionTier; // 0: Free, 1: Pro, 2: Enterprise
    
    // Batch operation tracking
    mapping(address => uint256) public lastBatchOperation;

    // Events
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 fee
    );
    
    event EscrowFunded(
        uint256 indexed escrowId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );
    
    event DeliveryMarked(
        uint256 indexed escrowId,
        address indexed seller,
        uint256 timestamp
    );
    
    event DeliveryConfirmed(
        uint256 indexed escrowId,
        address indexed buyer,
        uint256 timestamp
    );
    
    event DisputeRaised(
        uint256 indexed escrowId,
        address indexed disputer,
        string reason,
        uint256 timestamp
    );
    
    event DisputeResolved(
        uint256 indexed escrowId,
        address indexed arbitrator,
        bool refunded,
        string resolution,
        uint256 timestamp
    );
    
    event EscrowCompleted(
        uint256 indexed escrowId,
        address indexed seller,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );
    
    event EscrowRefunded(
        uint256 indexed escrowId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );
    
    event EscrowCancelled(
        uint256 indexed escrowId,
        uint256 timestamp
    );
    
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event DisputeWindowUpdated(uint256 oldWindow, uint256 newWindow);

    // Modifiers
    modifier onlyBuyer(uint256 _escrowId) {
        require(msg.sender == escrows[_escrowId].buyer, "Only buyer can call");
        _;
    }

    modifier onlySeller(uint256 _escrowId) {
        require(msg.sender == escrows[_escrowId].seller, "Only seller can call");
        _;
    }

    modifier onlyParty(uint256 _escrowId) {
        require(
            msg.sender == escrows[_escrowId].buyer || 
            msg.sender == escrows[_escrowId].seller,
            "Only escrow parties can call"
        );
        _;
    }

    modifier escrowExists(uint256 _escrowId) {
        require(_escrowId < nextEscrowId, "Escrow does not exist");
        _;
    }

    modifier inStatus(uint256 _escrowId, Status _status) {
        require(escrows[_escrowId].status == _status, "Invalid escrow status");
        _;
    }

    /**
     * @dev Constructor
     * @param _feeRecipient Address to receive platform fees
     */
    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ARBITRATOR_ROLE, msg.sender);
        
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Create a new escrow (basic version for backward compatibility)
     * @param _seller Address of the seller
     * @param _amount Amount to be escrowed (excluding fee)
     * @param _disputeWindow Custom dispute window (0 for default)
     * @param _metadata Optional metadata string
     * @return escrowId The ID of the created escrow
     */
    function createEscrow(
        address _seller,
        uint256 _amount,
        uint256 _disputeWindow,
        string memory _metadata
    ) external payable whenNotPaused returns (uint256 escrowId) {
        return createEscrowWithTemplate(_seller, _amount, _disputeWindow, _metadata, "", new address[](0));
    }
    
    /**
     * @dev Create a new escrow with enhanced features
     * @param _seller Address of the seller
     * @param _amount Amount to be escrowed (excluding fee)
     * @param _disputeWindow Custom dispute window (0 for default)
     * @param _metadata Optional metadata string
     * @param _templateId Optional template ID for predefined settings
     * @param _approvers Optional array of approvers for multi-sig
     * @return escrowId The ID of the created escrow
     */
    function createEscrowWithTemplate(
        address _seller,
        uint256 _amount,
        uint256 _disputeWindow,
        string memory _metadata,
        string memory _templateId,
        address[] memory _approvers
    ) public payable whenNotPaused returns (uint256 escrowId) {
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer and seller cannot be the same");
        require(_amount > 0, "Amount must be greater than 0");

        // Calculate tiered fee based on subscription
        uint256 feePercentage = _getTieredFeePercentage(msg.sender);
        
        // Apply template if provided
        if (bytes(_templateId).length > 0 && templates[_templateId].exists) {
            EscrowTemplate memory template = templates[_templateId];
            if (template.feePercentage > 0) {
                feePercentage = template.feePercentage;
            }
            if (_disputeWindow == 0) {
                _disputeWindow = template.disputeWindow;
            }
        }
        
        uint256 fee = (_amount * feePercentage) / BASIS_POINTS;
        uint256 totalRequired = _amount + fee;
        
        // Check if correct amount is sent (optional: can be funded later)
        if (msg.value > 0) {
            require(msg.value == totalRequired, "Incorrect payment amount");
        }

        escrowId = nextEscrowId++;
        
        Escrow storage newEscrow = escrows[escrowId];
        newEscrow.buyer = msg.sender;
        newEscrow.seller = _seller;
        newEscrow.amount = _amount;
        newEscrow.fee = fee;
        newEscrow.status = Status.CREATED;
        newEscrow.createdAt = block.timestamp;
        newEscrow.disputeWindow = _disputeWindow > 0 ? _disputeWindow : defaultDisputeWindow;
        newEscrow.metadata = _metadata;
        newEscrow.chainId = block.chainid;
        
        // Setup multi-sig if required
        if (_amount >= multiSigThreshold || _approvers.length > 0) {
            if (_approvers.length > 0) {
                newEscrow.approvers = _approvers;
                newEscrow.approvalsRequired = _approvers.length > 1 ? (_approvers.length / 2) + 1 : 1;
            } else {
                newEscrow.approvalsRequired = defaultApprovalsRequired;
            }
        }

        // Add to user mappings
        userEscrows[msg.sender].push(escrowId);
        userEscrows[_seller].push(escrowId);
        userActiveEscrowCount[msg.sender]++;
        userActiveEscrowCount[_seller]++;

        emit EscrowCreated(escrowId, msg.sender, _seller, _amount, fee);

        // If funded during creation
        if (msg.value > 0) {
            _fundEscrow(escrowId);
        }

        return escrowId;
    }

    /**
     * @dev Fund an existing escrow
     * @param _escrowId ID of the escrow to fund
     */
    function fundEscrow(uint256 _escrowId) 
        external 
        payable 
        whenNotPaused
        nonReentrant
        escrowExists(_escrowId)
        onlyBuyer(_escrowId)
        inStatus(_escrowId, Status.CREATED)
    {
        _fundEscrow(_escrowId);
    }

    /**
     * @dev Internal function to fund escrow
     */
    function _fundEscrow(uint256 _escrowId) internal {
        Escrow storage escrow = escrows[_escrowId];
        uint256 totalRequired = escrow.amount + escrow.fee;
        
        require(msg.value == totalRequired, "Incorrect payment amount");
        
        escrow.status = Status.FUNDED;
        escrow.fundedAt = block.timestamp;
        
        emit EscrowFunded(_escrowId, escrow.buyer, escrow.amount, block.timestamp);
    }

    /**
     * @dev Mark delivery as complete (called by seller)
     * @param _escrowId ID of the escrow
     */
    function markDelivered(uint256 _escrowId)
        external
        whenNotPaused
        escrowExists(_escrowId)
        onlySeller(_escrowId)
        inStatus(_escrowId, Status.FUNDED)
    {
        escrows[_escrowId].status = Status.DELIVERED;
        
        emit DeliveryMarked(_escrowId, msg.sender, block.timestamp);
    }

    /**
     * @dev Confirm delivery and release funds (called by buyer)
     * @param _escrowId ID of the escrow
     */
    function confirmDelivery(uint256 _escrowId)
        external
        whenNotPaused
        nonReentrant
        escrowExists(_escrowId)
        onlyBuyer(_escrowId)
    {
        Escrow storage escrow = escrows[_escrowId];
        require(
            escrow.status == Status.FUNDED || escrow.status == Status.DELIVERED,
            "Cannot confirm delivery in current status"
        );
        
        escrow.status = Status.CONFIRMED;
        
        emit DeliveryConfirmed(_escrowId, msg.sender, block.timestamp);
        
        // Release funds to seller
        _releaseFunds(_escrowId);
    }

    /**
     * @dev Raise a dispute
     * @param _escrowId ID of the escrow
     * @param _reason Reason for the dispute
     */
    function raiseDispute(uint256 _escrowId, string memory _reason)
        external
        whenNotPaused
        escrowExists(_escrowId)
        onlyParty(_escrowId)
    {
        Escrow storage escrow = escrows[_escrowId];
        require(
            escrow.status == Status.FUNDED || 
            escrow.status == Status.DELIVERED,
            "Cannot dispute in current status"
        );
        
        // Check if within dispute window
        require(
            block.timestamp <= escrow.fundedAt + escrow.disputeWindow,
            "Dispute window has expired"
        );
        
        escrow.status = Status.DISPUTED;
        disputeReasons[_escrowId] = _reason;
        
        emit DisputeRaised(_escrowId, msg.sender, _reason, block.timestamp);
    }

    /**
     * @dev Resolve a dispute (admin/arbitrator only)
     * @param _escrowId ID of the escrow
     * @param _refundToBuyer Whether to refund to buyer (true) or release to seller (false)
     * @param _resolution Resolution details
     */
    function resolveDispute(
        uint256 _escrowId,
        bool _refundToBuyer,
        string memory _resolution
    )
        external
        whenNotPaused
        nonReentrant
        escrowExists(_escrowId)
        onlyRole(ARBITRATOR_ROLE)
        inStatus(_escrowId, Status.DISPUTED)
    {
        Escrow storage escrow = escrows[_escrowId];
        resolutionDetails[_escrowId] = _resolution;
        
        if (_refundToBuyer) {
            escrow.status = Status.REFUNDED;
            
            // Update active escrow counts before refund
            if (userActiveEscrowCount[escrow.buyer] > 0) {
                userActiveEscrowCount[escrow.buyer]--;
            }
            if (userActiveEscrowCount[escrow.seller] > 0) {
                userActiveEscrowCount[escrow.seller]--;
            }
            
            // Refund to buyer (amount + fee)
            uint256 refundAmount = escrow.amount + escrow.fee;
            (bool success, ) = payable(escrow.buyer).call{value: refundAmount}("");
            require(success, "Refund transfer failed");
            
            emit EscrowRefunded(_escrowId, escrow.buyer, refundAmount, block.timestamp);
        } else {
            escrow.status = Status.COMPLETED;
            _releaseFunds(_escrowId);
        }
        
        emit DisputeResolved(_escrowId, msg.sender, _refundToBuyer, _resolution, block.timestamp);
    }

    /**
     * @dev Internal function to release funds to seller
     */
    function _releaseFunds(uint256 _escrowId) internal {
        Escrow storage escrow = escrows[_escrowId];
        
        escrow.status = Status.COMPLETED;
        
        // Transfer fee to platform
        if (!escrow.feeCollected && escrow.fee > 0) {
            escrow.feeCollected = true;
            totalFeesCollected += escrow.fee;
            (bool feeSuccess, ) = payable(feeRecipient).call{value: escrow.fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        // Transfer amount to seller
        (bool success, ) = payable(escrow.seller).call{value: escrow.amount}("");
        require(success, "Seller transfer failed");
        
        // Update active escrow counts
        if (userActiveEscrowCount[escrow.buyer] > 0) {
            userActiveEscrowCount[escrow.buyer]--;
        }
        if (userActiveEscrowCount[escrow.seller] > 0) {
            userActiveEscrowCount[escrow.seller]--;
        }
        
        emit EscrowCompleted(_escrowId, escrow.seller, escrow.amount, escrow.fee, block.timestamp);
    }

    /**
     * @dev Cancel an unfunded escrow
     * @param _escrowId ID of the escrow
     */
    function cancelEscrow(uint256 _escrowId)
        external
        whenNotPaused
        escrowExists(_escrowId)
        onlyParty(_escrowId)
        inStatus(_escrowId, Status.CREATED)
    {
        Escrow storage escrow = escrows[_escrowId];
        escrow.status = Status.CANCELLED;
        
        // Update active escrow counts
        if (userActiveEscrowCount[escrow.buyer] > 0) {
            userActiveEscrowCount[escrow.buyer]--;
        }
        if (userActiveEscrowCount[escrow.seller] > 0) {
            userActiveEscrowCount[escrow.seller]--;
        }
        
        emit EscrowCancelled(_escrowId, block.timestamp);
    }

    /**
     * @dev Auto-release funds after dispute window expires
     * @param _escrowId ID of the escrow
     */
    function autoRelease(uint256 _escrowId)
        external
        whenNotPaused
        nonReentrant
        escrowExists(_escrowId)
    {
        Escrow storage escrow = escrows[_escrowId];
        
        require(
            escrow.status == Status.FUNDED || escrow.status == Status.DELIVERED,
            "Cannot auto-release in current status"
        );
        
        require(
            block.timestamp > escrow.fundedAt + escrow.disputeWindow,
            "Dispute window has not expired"
        );
        
        _releaseFunds(_escrowId);
    }

    /**
     * @dev Get user's escrow IDs
     * @param _user Address of the user
     * @return Array of escrow IDs
     */
    function getUserEscrows(address _user) external view returns (uint256[] memory) {
        return userEscrows[_user];
    }

    /**
     * @dev Get escrow basic details
     * @param _escrowId ID of the escrow
     */
    function getEscrowDetails(uint256 _escrowId) 
        external 
        view 
        escrowExists(_escrowId)
        returns (
            address buyer,
            address seller,
            uint256 amount,
            uint256 fee,
            Status status,
            uint256 createdAt,
            uint256 fundedAt,
            uint256 disputeWindow,
            string memory metadata
        ) 
    {
        Escrow storage escrow = escrows[_escrowId];
        return (
            escrow.buyer,
            escrow.seller,
            escrow.amount,
            escrow.fee,
            escrow.status,
            escrow.createdAt,
            escrow.fundedAt,
            escrow.disputeWindow,
            escrow.metadata
        );
    }
    
    /**
     * @dev Get escrow statistics
     * @return totalEscrows Total number of escrows created
     * @return activeEscrows Number of active escrows
     * @return completedEscrows Number of completed escrows
     * @return disputedEscrows Number of disputed escrows
     * @return totalVolume Total volume locked in escrows
     * @return feesCollected Total fees collected
     * @return availableFees Available fees for withdrawal
     */
    function getEscrowStats() external view returns (
        uint256 totalEscrows,
        uint256 activeEscrows,
        uint256 completedEscrows,
        uint256 disputedEscrows,
        uint256 totalVolume,
        uint256 feesCollected,
        uint256 availableFees
    ) {
        totalEscrows = nextEscrowId;
        
        for (uint256 i = 0; i < nextEscrowId; i++) {
            Escrow storage escrow = escrows[i];
            
            if (escrow.status == Status.FUNDED || 
                escrow.status == Status.DELIVERED) {
                activeEscrows++;
            } else if (escrow.status == Status.COMPLETED) {
                completedEscrows++;
            } else if (escrow.status == Status.DISPUTED) {
                disputedEscrows++;
            }
            
            if (escrow.status != Status.CANCELLED) {
                totalVolume += escrow.amount;
            }
        }
        
        feesCollected = totalFeesCollected;
        availableFees = address(this).balance;
    }
    
    /**
     * @dev Get active escrows (paginated)
     * @param offset Starting index
     * @param limit Number of escrows to return
     * @return escrowIds Array of escrow IDs
     * @return count Total number of active escrows
     */
    function getActiveEscrows(uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory escrowIds, uint256 count) 
    {
        // First count active escrows
        for (uint256 i = 0; i < nextEscrowId; i++) {
            if (escrows[i].status == Status.FUNDED || 
                escrows[i].status == Status.DELIVERED) {
                count++;
            }
        }
        
        // Determine actual size
        uint256 actualSize = (offset + limit > count) ? count - offset : limit;
        if (offset >= count) {
            return (new uint256[](0), count);
        }
        
        escrowIds = new uint256[](actualSize);
        uint256 currentIndex = 0;
        uint256 addedCount = 0;
        
        for (uint256 i = 0; i < nextEscrowId && addedCount < actualSize; i++) {
            if (escrows[i].status == Status.FUNDED || 
                escrows[i].status == Status.DELIVERED) {
                if (currentIndex >= offset) {
                    escrowIds[addedCount] = i;
                    addedCount++;
                }
                currentIndex++;
            }
        }
    }
    
    /**
     * @dev Get disputed escrows
     * @return escrowIds Array of disputed escrow IDs
     */
    function getDisputedEscrows() external view returns (uint256[] memory escrowIds) {
        uint256 count = 0;
        
        // Count disputed escrows
        for (uint256 i = 0; i < nextEscrowId; i++) {
            if (escrows[i].status == Status.DISPUTED) {
                count++;
            }
        }
        
        escrowIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nextEscrowId; i++) {
            if (escrows[i].status == Status.DISPUTED) {
                escrowIds[index] = i;
                index++;
            }
        }
    }
    
    /**
     * @dev Get available fees for withdrawal
     * @return availableFees Amount available for withdrawal
     */
    function getAvailableFees() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get dispute details for an escrow
     * @param _escrowId ID of the escrow
     */
    function getDisputeDetails(uint256 _escrowId)
        external
        view
        escrowExists(_escrowId)
        returns (
            string memory disputeReason,
            string memory resolution
        )
    {
        return (
            disputeReasons[_escrowId],
            resolutionDetails[_escrowId]
        );
    }

    /**
     * @dev Calculate fee for an amount
     * @param _amount The escrow amount
     * @return fee The calculated fee
     */
    function calculateFee(uint256 _amount) external view returns (uint256 fee) {
        return (_amount * baseFeePercentage) / BASIS_POINTS;
    }

    // Admin functions

    /**
     * @dev Update base fee percentage
     * @param _newFeePercentage New fee in basis points (250 = 2.5%)
     */
    function updateFeePercentage(uint256 _newFeePercentage) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(_newFeePercentage <= 1000, "Fee too high"); // Max 10%
        uint256 oldFee = baseFeePercentage;
        baseFeePercentage = _newFeePercentage;
        emit FeeUpdated(oldFee, _newFeePercentage);
    }

    /**
     * @dev Update fee recipient address
     * @param _newRecipient New fee recipient address
     */
    function updateFeeRecipient(address _newRecipient) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(_newRecipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }

    /**
     * @dev Update default dispute window
     * @param _newWindow New dispute window in seconds
     */
    function updateDefaultDisputeWindow(uint256 _newWindow) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(_newWindow >= 1 days && _newWindow <= 30 days, "Invalid window");
        uint256 oldWindow = defaultDisputeWindow;
        defaultDisputeWindow = _newWindow;
        emit DisputeWindowUpdated(oldWindow, _newWindow);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Withdraw accumulated fees (emergency only)
     */
    function withdrawFees() external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(feeRecipient).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Internal function to get tiered fee percentage
     */
    function _getTieredFeePercentage(address user) internal view returns (uint256) {
        uint8 tier = userSubscriptionTier[user];
        if (tier == 2) return enterpriseTierFeePercentage; // Enterprise
        if (tier == 1) return proTierFeePercentage; // Pro
        return baseFeePercentage; // Free tier
    }
    
    /**
     * @dev Batch create multiple escrows
     */
    function batchCreateEscrows(
        address[] memory _sellers,
        uint256[] memory _amounts,
        uint256[] memory _disputeWindows,
        string[] memory _metadatas
    ) external payable whenNotPaused returns (uint256[] memory escrowIds) {
        require(
            _sellers.length == _amounts.length &&
            _sellers.length == _disputeWindows.length &&
            _sellers.length == _metadatas.length,
            "Array lengths mismatch"
        );
        require(_sellers.length <= 10, "Max 10 escrows per batch");
        
        escrowIds = new uint256[](_sellers.length);
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < _sellers.length; i++) {
            uint256 feePercentage = _getTieredFeePercentage(msg.sender);
            uint256 fee = (_amounts[i] * feePercentage) / BASIS_POINTS;
            totalValue += _amounts[i] + fee;
        }
        
        require(msg.value == totalValue, "Incorrect total payment");
        
        for (uint256 i = 0; i < _sellers.length; i++) {
            // Create each escrow (simplified for batch - no templates/multi-sig)
            uint256 escrowId = nextEscrowId++;
            
            uint256 feePercentage = _getTieredFeePercentage(msg.sender);
            uint256 fee = (_amounts[i] * feePercentage) / BASIS_POINTS;
            
            Escrow storage newEscrow = escrows[escrowId];
            newEscrow.buyer = msg.sender;
            newEscrow.seller = _sellers[i];
            newEscrow.amount = _amounts[i];
            newEscrow.fee = fee;
            newEscrow.status = Status.FUNDED; // Auto-fund in batch
            newEscrow.createdAt = block.timestamp;
            newEscrow.fundedAt = block.timestamp;
            newEscrow.disputeWindow = _disputeWindows[i] > 0 ? _disputeWindows[i] : defaultDisputeWindow;
            newEscrow.metadata = _metadatas[i];
            newEscrow.chainId = block.chainid;
            
            userEscrows[msg.sender].push(escrowId);
            userEscrows[_sellers[i]].push(escrowId);
            userActiveEscrowCount[msg.sender]++;
            userActiveEscrowCount[_sellers[i]]++;
            
            escrowIds[i] = escrowId;
            
            emit EscrowCreated(escrowId, msg.sender, _sellers[i], _amounts[i], fee);
            emit EscrowFunded(escrowId, msg.sender, _amounts[i], block.timestamp);
        }
        
        lastBatchOperation[msg.sender] = block.timestamp;
    }
    
    /**
     * @dev Create or update escrow template
     */
    function setEscrowTemplate(
        string memory _templateId,
        uint256 _disputeWindow,
        uint256 _feePercentage,
        bool _requiresMultiSig,
        uint256 _approvalsRequired
    ) external onlyRole(ADMIN_ROLE) {
        require(bytes(_templateId).length > 0, "Template ID required");
        require(_feePercentage <= 1000, "Fee too high"); // Max 10%
        
        templates[_templateId] = EscrowTemplate({
            disputeWindow: _disputeWindow,
            feePercentage: _feePercentage,
            requiresMultiSig: _requiresMultiSig,
            approvalsRequired: _approvalsRequired,
            exists: true
        });
    }
    
    /**
     * @dev Set user subscription tier (called by subscription contract or admin)
     */
    function setUserSubscriptionTier(address user, uint8 tier) external onlyRole(ADMIN_ROLE) {
        require(tier <= 2, "Invalid tier");
        userSubscriptionTier[user] = tier;
    }
    
    /**
     * @dev Batch set user subscription tiers
     */
    function batchSetUserSubscriptionTiers(
        address[] memory users,
        uint8[] memory tiers
    ) external onlyRole(ADMIN_ROLE) {
        require(users.length == tiers.length, "Array lengths mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            require(tiers[i] <= 2, "Invalid tier");
            userSubscriptionTier[users[i]] = tiers[i];
        }
    }
    
    /**
     * @dev Approve multi-sig escrow
     */
    function approveEscrow(uint256 _escrowId) 
        external 
        whenNotPaused
        escrowExists(_escrowId)
    {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.approvalsRequired > 0, "Not a multi-sig escrow");
        require(!escrow.hasApproved[msg.sender], "Already approved");
        
        // Check if sender is an authorized approver
        bool isApprover = false;
        for (uint256 i = 0; i < escrow.approvers.length; i++) {
            if (escrow.approvers[i] == msg.sender) {
                isApprover = true;
                break;
            }
        }
        
        // If no specific approvers set, allow buyer/seller to approve
        if (escrow.approvers.length == 0) {
            require(
                msg.sender == escrow.buyer || msg.sender == escrow.seller,
                "Not authorized to approve"
            );
            isApprover = true;
        }
        
        require(isApprover, "Not an authorized approver");
        
        escrow.hasApproved[msg.sender] = true;
        escrow.approvalCount++;
        
        // Auto-release if enough approvals
        if (escrow.approvalCount >= escrow.approvalsRequired &&
            (escrow.status == Status.FUNDED || escrow.status == Status.DELIVERED)) {
            _releaseFunds(_escrowId);
        }
    }
    
    /**
     * @dev Update fee tiers
     */
    function updateFeeTiers(
        uint256 _baseFee,
        uint256 _proFee,
        uint256 _enterpriseFee
    ) external onlyRole(ADMIN_ROLE) {
        require(_baseFee <= 1000, "Base fee too high");
        require(_proFee <= _baseFee, "Pro fee must be <= base fee");
        require(_enterpriseFee <= _proFee, "Enterprise fee must be <= pro fee");
        
        baseFeePercentage = _baseFee;
        proTierFeePercentage = _proFee;
        enterpriseTierFeePercentage = _enterpriseFee;
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}