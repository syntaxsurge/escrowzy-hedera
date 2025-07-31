// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/EscrowCore.sol";

contract EscrowCoreTest is Test {
    EscrowCore public escrowCore;
    
    address public admin = address(1);
    address public arbitrator = address(2);
    address public buyer = address(3);
    address public seller = address(4);
    address public feeRecipient = address(5);
    address public other = address(6);
    address public approver1 = address(7);
    address public approver2 = address(8);
    address public proBuyer = address(9);
    address public enterpriseBuyer = address(10);
    
    uint256 public constant ESCROW_AMOUNT = 1 ether;
    uint256 public constant BASE_FEE_PERCENTAGE = 250; // 2.5%
    uint256 public constant BASIS_POINTS = 10000;
    
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

    function setUp() public {
        vm.startPrank(admin);
        escrowCore = new EscrowCore(feeRecipient);
        escrowCore.grantRole(escrowCore.ARBITRATOR_ROLE(), arbitrator);
        
        // Set subscription tiers for testing
        escrowCore.setUserSubscriptionTier(proBuyer, 1); // Pro tier
        escrowCore.setUserSubscriptionTier(enterpriseBuyer, 2); // Enterprise tier
        
        vm.stopPrank();
        
        // Fund test accounts
        vm.deal(buyer, 20 ether);
        vm.deal(seller, 10 ether);
        vm.deal(other, 10 ether);
        vm.deal(proBuyer, 10 ether);
        vm.deal(enterpriseBuyer, 10 ether);
        vm.deal(approver1, 10 ether);
        vm.deal(approver2, 10 ether);
    }

    function calculateTotalRequired(uint256 amount) public pure returns (uint256) {
        uint256 fee = (amount * BASE_FEE_PERCENTAGE) / BASIS_POINTS;
        return amount + fee;
    }

    // Test: Create escrow
    function testCreateEscrow() public {
        vm.startPrank(buyer);
        
        uint256 escrowId = escrowCore.createEscrow(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        assertEq(escrowId, 0, "First escrow should have ID 0");
        
        (
            address escrowBuyer,
            address escrowSeller,
            uint256 amount,
            uint256 fee,
            EscrowCore.Status status,
            ,
            ,
            ,
        ) = escrowCore.getEscrowDetails(escrowId);
        
        assertEq(escrowBuyer, buyer, "Buyer should match");
        assertEq(escrowSeller, seller, "Seller should match");
        assertEq(amount, ESCROW_AMOUNT, "Amount should match");
        assertEq(fee, (ESCROW_AMOUNT * BASE_FEE_PERCENTAGE) / BASIS_POINTS, "Fee should be 2.5%");
        assertEq(uint256(status), uint256(EscrowCore.Status.CREATED), "Status should be CREATED");
        
        vm.stopPrank();
    }

    // Test: Create and fund escrow in one transaction
    function testCreateAndFundEscrow() public {
        vm.startPrank(buyer);
        
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        (,,,, EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status), uint256(EscrowCore.Status.FUNDED), "Status should be FUNDED");
        
        vm.stopPrank();
    }

    // Test: Fund escrow separately
    function testFundEscrow() public {
        vm.startPrank(buyer);
        
        uint256 escrowId = escrowCore.createEscrow(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        
        vm.expectEmit(true, true, false, true);
        emit EscrowFunded(escrowId, buyer, ESCROW_AMOUNT, block.timestamp);
        
        escrowCore.fundEscrow{value: totalRequired}(escrowId);
        
        (,,,, EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status), uint256(EscrowCore.Status.FUNDED), "Status should be FUNDED");
        
        vm.stopPrank();
    }

    // Test: Mark delivery
    function testMarkDelivered() public {
        // Create and fund escrow
        vm.startPrank(buyer);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        vm.stopPrank();
        
        // Seller marks as delivered
        vm.startPrank(seller);
        escrowCore.markDelivered(escrowId);
        vm.stopPrank();
        
        (,,,, EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status), uint256(EscrowCore.Status.DELIVERED), "Status should be DELIVERED");
    }

    // Test: Confirm delivery and release funds
    function testConfirmDelivery() public {
        // Create and fund escrow
        vm.startPrank(buyer);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        uint256 sellerBalanceBefore = seller.balance;
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;
        
        // Buyer confirms delivery
        escrowCore.confirmDelivery(escrowId);
        vm.stopPrank();
        
        (,,,, EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status), uint256(EscrowCore.Status.COMPLETED), "Status should be COMPLETED");
        
        // Check balances
        uint256 expectedFee = (ESCROW_AMOUNT * BASE_FEE_PERCENTAGE) / BASIS_POINTS;
        assertEq(seller.balance, sellerBalanceBefore + ESCROW_AMOUNT, "Seller should receive amount");
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + expectedFee, "Fee recipient should receive fee");
    }

    // Test: Raise dispute
    function testRaiseDispute() public {
        // Create and fund escrow
        vm.startPrank(buyer);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        string memory reason = "Item not as described";
        
        vm.expectEmit(true, true, false, true);
        emit DisputeRaised(escrowId, buyer, reason, block.timestamp);
        
        escrowCore.raiseDispute(escrowId, reason);
        vm.stopPrank();
        
        (,,,, EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status), uint256(EscrowCore.Status.DISPUTED), "Status should be DISPUTED");
    }

    // Test: Resolve dispute - refund to buyer
    function testResolveDisputeRefund() public {
        // Create and fund escrow
        vm.startPrank(buyer);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        uint256 buyerBalanceBefore = buyer.balance;
        
        // Raise dispute
        escrowCore.raiseDispute(escrowId, "Item not received");
        vm.stopPrank();
        
        // Arbitrator resolves dispute - refund to buyer
        vm.startPrank(arbitrator);
        escrowCore.resolveDispute(escrowId, true, "Seller did not provide proof of delivery");
        vm.stopPrank();
        
        (,,,, EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status), uint256(EscrowCore.Status.REFUNDED), "Status should be REFUNDED");
        
        // Check buyer received refund (amount + fee)
        assertEq(buyer.balance, buyerBalanceBefore + totalRequired, "Buyer should receive full refund");
    }

    // Test: Resolve dispute - release to seller
    function testResolveDisputeRelease() public {
        // Create and fund escrow
        vm.startPrank(buyer);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        // Raise dispute
        escrowCore.raiseDispute(escrowId, "Minor issue");
        vm.stopPrank();
        
        uint256 sellerBalanceBefore = seller.balance;
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;
        
        // Arbitrator resolves dispute - release to seller
        vm.startPrank(arbitrator);
        escrowCore.resolveDispute(escrowId, false, "Buyer's claim not valid");
        vm.stopPrank();
        
        (,,,, EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status), uint256(EscrowCore.Status.COMPLETED), "Status should be COMPLETED");
        
        // Check balances
        uint256 expectedFee = (ESCROW_AMOUNT * BASE_FEE_PERCENTAGE) / BASIS_POINTS;
        assertEq(seller.balance, sellerBalanceBefore + ESCROW_AMOUNT, "Seller should receive amount");
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + expectedFee, "Fee recipient should receive fee");
    }

    // Test: Auto-release after dispute window
    function testAutoRelease() public {
        // Create and fund escrow with 1 day dispute window
        vm.startPrank(buyer);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            1 days,
            "Test metadata"
        );
        vm.stopPrank();
        
        // Try auto-release before window expires (should fail)
        vm.expectRevert("Dispute window has not expired");
        escrowCore.autoRelease(escrowId);
        
        // Fast forward past dispute window
        vm.warp(block.timestamp + 1 days + 1);
        
        uint256 sellerBalanceBefore = seller.balance;
        
        // Auto-release should work now
        escrowCore.autoRelease(escrowId);
        
        (,,,, EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status), uint256(EscrowCore.Status.COMPLETED), "Status should be COMPLETED");
        assertEq(seller.balance, sellerBalanceBefore + ESCROW_AMOUNT, "Seller should receive amount");
    }

    // Test: Cancel unfunded escrow
    function testCancelEscrow() public {
        vm.startPrank(buyer);
        
        uint256 escrowId = escrowCore.createEscrow(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        escrowCore.cancelEscrow(escrowId);
        
        (,,,, EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status), uint256(EscrowCore.Status.CANCELLED), "Status should be CANCELLED");
        
        vm.stopPrank();
    }

    // Test: Cannot cancel funded escrow
    function testCannotCancelFundedEscrow() public {
        vm.startPrank(buyer);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        vm.expectRevert("Invalid escrow status");
        escrowCore.cancelEscrow(escrowId);
        
        vm.stopPrank();
    }

    // Test: Dispute window expiry
    function testDisputeWindowExpiry() public {
        // Create and fund escrow with 1 day dispute window
        vm.startPrank(buyer);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            1 days,
            "Test metadata"
        );
        
        // Fast forward past dispute window
        vm.warp(block.timestamp + 1 days + 1);
        
        // Should not be able to raise dispute after window expires
        vm.expectRevert("Dispute window has expired");
        escrowCore.raiseDispute(escrowId, "Too late");
        
        vm.stopPrank();
    }

    // Test: Only buyer can fund
    function testOnlyBuyerCanFund() public {
        vm.startPrank(buyer);
        uint256 escrowId = escrowCore.createEscrow(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        vm.stopPrank();
        
        vm.startPrank(other);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        
        vm.expectRevert("Only buyer can call");
        escrowCore.fundEscrow{value: totalRequired}(escrowId);
        
        vm.stopPrank();
    }

    // Test: Only seller can mark delivered
    function testOnlySellerCanMarkDelivered() public {
        vm.startPrank(buyer);
        uint256 totalRequired = calculateTotalRequired(ESCROW_AMOUNT);
        uint256 escrowId = escrowCore.createEscrow{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            0,
            "Test metadata"
        );
        
        vm.expectRevert("Only seller can call");
        escrowCore.markDelivered(escrowId);
        
        vm.stopPrank();
    }

    // Test: Fee calculation
    function testFeeCalculation() public view {
        uint256 fee = escrowCore.calculateFee(ESCROW_AMOUNT);
        uint256 expectedFee = (ESCROW_AMOUNT * BASE_FEE_PERCENTAGE) / BASIS_POINTS;
        assertEq(fee, expectedFee, "Fee calculation should be correct");
    }

    // Test: Update fee percentage (admin only)
    function testUpdateFeePercentage() public {
        uint256 newFeePercentage = 300; // 3%
        
        vm.startPrank(admin);
        escrowCore.updateFeePercentage(newFeePercentage);
        vm.stopPrank();
        
        assertEq(escrowCore.baseFeePercentage(), newFeePercentage, "Fee should be updated");
        
        // Test non-admin cannot update
        vm.startPrank(other);
        vm.expectRevert();
        escrowCore.updateFeePercentage(400);
        vm.stopPrank();
    }

    // Test: Pause and unpause
    function testPauseUnpause() public {
        vm.startPrank(admin);
        escrowCore.pause();
        vm.stopPrank();
        
        // Should not be able to create escrow when paused
        vm.startPrank(buyer);
        vm.expectRevert();
        escrowCore.createEscrow(seller, ESCROW_AMOUNT, 0, "Test");
        vm.stopPrank();
        
        // Unpause
        vm.startPrank(admin);
        escrowCore.unpause();
        vm.stopPrank();
        
        // Should be able to create escrow now
        vm.startPrank(buyer);
        uint256 escrowId = escrowCore.createEscrow(seller, ESCROW_AMOUNT, 0, "Test");
        assertEq(escrowId, 0, "Should be able to create escrow after unpause");
        vm.stopPrank();
    }

    // Test: Get user escrows
    function testGetUserEscrows() public {
        vm.startPrank(buyer);
        
        // Create multiple escrows
        escrowCore.createEscrow(seller, ESCROW_AMOUNT, 0, "Test 1");
        escrowCore.createEscrow(seller, ESCROW_AMOUNT * 2, 0, "Test 2");
        escrowCore.createEscrow(address(7), ESCROW_AMOUNT * 3, 0, "Test 3");
        
        uint256[] memory buyerEscrows = escrowCore.getUserEscrows(buyer);
        assertEq(buyerEscrows.length, 3, "Buyer should have 3 escrows");
        assertEq(buyerEscrows[0], 0, "First escrow ID should be 0");
        assertEq(buyerEscrows[1], 1, "Second escrow ID should be 1");
        assertEq(buyerEscrows[2], 2, "Third escrow ID should be 2");
        
        uint256[] memory sellerEscrows = escrowCore.getUserEscrows(seller);
        assertEq(sellerEscrows.length, 2, "Seller should have 2 escrows");
        
        vm.stopPrank();
    }

    // Test: Active escrow count
    function testActiveEscrowCount() public {
        vm.startPrank(buyer);
        
        assertEq(escrowCore.userActiveEscrowCount(buyer), 0, "Should start with 0 active escrows");
        
        // Create escrow
        uint256 escrowId = escrowCore.createEscrow(seller, ESCROW_AMOUNT, 0, "Test");
        assertEq(escrowCore.userActiveEscrowCount(buyer), 1, "Should have 1 active escrow");
        assertEq(escrowCore.userActiveEscrowCount(seller), 1, "Seller should have 1 active escrow");
        
        // Cancel escrow
        escrowCore.cancelEscrow(escrowId);
        assertEq(escrowCore.userActiveEscrowCount(buyer), 0, "Should have 0 active escrows after cancel");
        assertEq(escrowCore.userActiveEscrowCount(seller), 0, "Seller should have 0 active escrows after cancel");
        
        vm.stopPrank();
    }
    
    // Test: Tiered fees based on subscription
    function testTieredFees() public {
        // Test Free tier (2.5%)
        vm.startPrank(buyer);
        uint256 freeEscrowId = escrowCore.createEscrow(seller, ESCROW_AMOUNT, 0, "Free tier");
        (,,,uint256 freeFee,,,,,) = escrowCore.getEscrowDetails(freeEscrowId);
        assertEq(freeFee, (ESCROW_AMOUNT * 250) / BASIS_POINTS, "Free tier should have 2.5% fee");
        vm.stopPrank();
        
        // Test Pro tier (2.0%)
        vm.startPrank(proBuyer);
        uint256 proEscrowId = escrowCore.createEscrow(seller, ESCROW_AMOUNT, 0, "Pro tier");
        (,,,uint256 proFee,,,,,) = escrowCore.getEscrowDetails(proEscrowId);
        assertEq(proFee, (ESCROW_AMOUNT * 200) / BASIS_POINTS, "Pro tier should have 2.0% fee");
        vm.stopPrank();
        
        // Test Enterprise tier (1.5%)
        vm.startPrank(enterpriseBuyer);
        uint256 enterpriseEscrowId = escrowCore.createEscrow(seller, ESCROW_AMOUNT, 0, "Enterprise tier");
        (,,,uint256 enterpriseFee,,,,,) = escrowCore.getEscrowDetails(enterpriseEscrowId);
        assertEq(enterpriseFee, (ESCROW_AMOUNT * 150) / BASIS_POINTS, "Enterprise tier should have 1.5% fee");
        vm.stopPrank();
    }
    
    // Test: Create escrow with template
    function testCreateEscrowWithTemplate() public {
        // Admin creates a template
        vm.startPrank(admin);
        escrowCore.setEscrowTemplate(
            "fast-trade",
            3 days,
            200, // 2% fee
            false,
            0
        );
        vm.stopPrank();
        
        // Buyer creates escrow using template
        vm.startPrank(buyer);
        uint256 totalRequired = ESCROW_AMOUNT + (ESCROW_AMOUNT * 200) / BASIS_POINTS; // 2% from template
        
        uint256 escrowId = escrowCore.createEscrowWithTemplate{value: totalRequired}(
            seller,
            ESCROW_AMOUNT,
            0, // Will use template's dispute window
            "Template escrow",
            "fast-trade",
            new address[](0)
        );
        
        (,,,uint256 fee,,,uint256 fundedAt,uint256 disputeWindow,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(fee, (ESCROW_AMOUNT * 200) / BASIS_POINTS, "Should use template fee");
        assertEq(disputeWindow, 3 days, "Should use template dispute window");
        assertTrue(fundedAt > 0, "Should be funded");
        
        vm.stopPrank();
    }
    
    // Test: Batch create escrows
    function testBatchCreateEscrows() public {
        vm.startPrank(buyer);
        
        address[] memory sellers = new address[](3);
        sellers[0] = address(0x20);
        sellers[1] = address(0x21);
        sellers[2] = address(0x22);
        
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1 ether;
        amounts[1] = 2 ether;
        amounts[2] = 3 ether;
        
        uint256[] memory disputeWindows = new uint256[](3);
        disputeWindows[0] = 7 days;
        disputeWindows[1] = 14 days;
        disputeWindows[2] = 21 days;
        
        string[] memory metadatas = new string[](3);
        metadatas[0] = "Escrow 1";
        metadatas[1] = "Escrow 2";
        metadatas[2] = "Escrow 3";
        
        // Calculate total value needed
        uint256 totalValue = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            uint256 fee = (amounts[i] * BASE_FEE_PERCENTAGE) / BASIS_POINTS;
            totalValue += amounts[i] + fee;
        }
        
        uint256[] memory escrowIds = escrowCore.batchCreateEscrows{value: totalValue}(
            sellers,
            amounts,
            disputeWindows,
            metadatas
        );
        
        assertEq(escrowIds.length, 3, "Should create 3 escrows");
        
        for (uint256 i = 0; i < escrowIds.length; i++) {
            (,address escrowSeller,uint256 amount,,EscrowCore.Status status,,,,) = escrowCore.getEscrowDetails(escrowIds[i]);
            assertEq(escrowSeller, sellers[i], "Seller should match");
            assertEq(amount, amounts[i], "Amount should match");
            assertEq(uint256(status), uint256(EscrowCore.Status.FUNDED), "Should be funded");
        }
        
        vm.stopPrank();
    }
    
    // Test: Multi-sig escrow
    function testMultiSigEscrow() public {
        vm.startPrank(buyer);
        
        address[] memory approvers = new address[](2);
        approvers[0] = approver1;
        approvers[1] = approver2;
        
        uint256 largeAmount = 15 ether; // Above multi-sig threshold
        uint256 fee = (largeAmount * BASE_FEE_PERCENTAGE) / BASIS_POINTS;
        uint256 totalRequired = largeAmount + fee;
        
        uint256 escrowId = escrowCore.createEscrowWithTemplate{value: totalRequired}(
            seller,
            largeAmount,
            7 days,
            "Multi-sig escrow",
            "",
            approvers
        );
        
        vm.stopPrank();
        
        // First approval
        vm.prank(approver1);
        escrowCore.approveEscrow(escrowId);
        
        // Check status - should still be funded
        (,,,, EscrowCore.Status status1,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status1), uint256(EscrowCore.Status.FUNDED), "Should still be funded after first approval");
        
        // Second approval - should trigger release
        vm.prank(approver2);
        escrowCore.approveEscrow(escrowId);
        
        // Check status - should be completed
        (,,,, EscrowCore.Status status2,,,,) = escrowCore.getEscrowDetails(escrowId);
        assertEq(uint256(status2), uint256(EscrowCore.Status.COMPLETED), "Should be completed after sufficient approvals");
    }
    
    // Test: Update fee tiers
    function testUpdateFeeTiers() public {
        vm.startPrank(admin);
        
        // Update fee tiers
        escrowCore.updateFeeTiers(300, 250, 200); // 3%, 2.5%, 2%
        
        assertEq(escrowCore.baseFeePercentage(), 300, "Base fee should be updated");
        assertEq(escrowCore.proTierFeePercentage(), 250, "Pro fee should be updated");
        assertEq(escrowCore.enterpriseTierFeePercentage(), 200, "Enterprise fee should be updated");
        
        vm.stopPrank();
        
        // Test non-admin cannot update
        vm.startPrank(other);
        vm.expectRevert();
        escrowCore.updateFeeTiers(400, 350, 300);
        vm.stopPrank();
    }
    
    // Test: Batch set user subscription tiers
    function testBatchSetUserSubscriptionTiers() public {
        address[] memory users = new address[](3);
        users[0] = address(0x30);
        users[1] = address(0x31);
        users[2] = address(0x32);
        
        uint8[] memory tiers = new uint8[](3);
        tiers[0] = 0; // Free
        tiers[1] = 1; // Pro
        tiers[2] = 2; // Enterprise
        
        vm.startPrank(admin);
        escrowCore.batchSetUserSubscriptionTiers(users, tiers);
        vm.stopPrank();
        
        assertEq(escrowCore.userSubscriptionTier(users[0]), 0, "User 0 should be Free tier");
        assertEq(escrowCore.userSubscriptionTier(users[1]), 1, "User 1 should be Pro tier");
        assertEq(escrowCore.userSubscriptionTier(users[2]), 2, "User 2 should be Enterprise tier");
    }
}