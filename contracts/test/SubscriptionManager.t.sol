// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/SubscriptionManager.sol";

contract SubscriptionManagerTest is Test {
    SubscriptionManager public subscriptionManager;
    address public admin = address(0x1);
    address public user = address(0x2);
    uint256 public proPriceWei = 0.01 ether;
    uint256 public enterprisePriceWei = 0.025 ether;

    function setUp() public {
        vm.prank(admin);
        subscriptionManager = new SubscriptionManager(admin, proPriceWei, enterprisePriceWei);
    }

    function testInitialSetup() public view {
        assertEq(subscriptionManager.hasRole(subscriptionManager.DEFAULT_ADMIN_ROLE(), admin), true);
        assertEq(subscriptionManager.hasRole(subscriptionManager.ADMIN_ROLE(), admin), true);
        assertEq(subscriptionManager.planPriceWei(1), proPriceWei);
        assertEq(subscriptionManager.planPriceWei(2), enterprisePriceWei);
    }

    function testSubscribePro() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        
        subscriptionManager.paySubscription{value: proPriceWei}(user, 1);
        
        assertGt(subscriptionManager.paidUntil(user), block.timestamp);
        assertEq(subscriptionManager.paidUntil(user), block.timestamp + 30 days);
    }

    function testSubscribeEnterprise() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        
        subscriptionManager.paySubscription{value: enterprisePriceWei}(user, 2);
        
        assertGt(subscriptionManager.paidUntil(user), block.timestamp);
        assertEq(subscriptionManager.paidUntil(user), block.timestamp + 30 days);
    }

    function testExtendSubscription() public {
        vm.deal(user, 2 ether);
        
        // First subscription
        vm.prank(user);
        subscriptionManager.paySubscription{value: proPriceWei}(user, 1);
        uint256 firstExpiry = subscriptionManager.paidUntil(user);
        
        // Extend subscription
        vm.prank(user);
        subscriptionManager.paySubscription{value: proPriceWei}(user, 1);
        uint256 secondExpiry = subscriptionManager.paidUntil(user);
        
        assertEq(secondExpiry, firstExpiry + 30 days);
    }

    function testInsufficientPayment() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        
        vm.expectRevert("Subscription: incorrect payment");
        subscriptionManager.paySubscription{value: proPriceWei - 1}(user, 1);
    }

    function testWithdrawEarnings() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        subscriptionManager.paySubscription{value: proPriceWei}(user, 1);
        
        uint256 contractBalance = address(subscriptionManager).balance;
        assertEq(contractBalance, proPriceWei);
        
        uint256 adminBalanceBefore = admin.balance;
        
        vm.prank(admin);
        subscriptionManager.withdrawEarnings(payable(admin), proPriceWei);
        
        assertEq(admin.balance, adminBalanceBefore + proPriceWei);
        assertEq(address(subscriptionManager).balance, 0);
    }

    function testOnlyAdminCanWithdraw() public {
        vm.expectRevert();
        vm.prank(user);
        subscriptionManager.withdrawEarnings(payable(user), 1 ether);
    }

    function testUpdatePlanPrice() public {
        uint256 newProPrice = 0.02 ether;
        
        vm.prank(admin);
        subscriptionManager.setPlanPrice(1, newProPrice);
        
        assertEq(subscriptionManager.planPriceWei(1), newProPrice);
    }

    function testOnlyAdminCanUpdatePrice() public {
        vm.expectRevert();
        vm.prank(user);
        subscriptionManager.setPlanPrice(1, 0.02 ether);
    }
}