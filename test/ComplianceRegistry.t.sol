// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { ComplianceRegistry } from "../src/ComplianceRegistry.sol";

/// @notice Full eval/harness for the M2 core build: issuer allowlist, attest,
///         revoke, read/verify, access control, and events.
contract ComplianceRegistryTest is Test {
    ComplianceRegistry internal registry;

    address internal owner = address(this);
    address internal issuer = makeAddr("issuer");
    address internal other = makeAddr("other");
    address internal subject = makeAddr("subject");

    bytes32 internal constant SCHEMA = keccak256("kyc-aml-v1");
    bytes32 internal constant DATA = keccak256("document-contents");

    // Mirror the contract events so expectEmit can match them.
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event Attested(
        uint256 indexed id,
        address indexed issuer,
        address indexed subject,
        bytes32 schemaId,
        bytes32 dataHash,
        uint64 issuedAt
    );
    event Revoked(uint256 indexed id, address indexed issuer, uint64 revokedAt);

    function setUp() public {
        registry = new ComplianceRegistry();
    }

    // --- metadata / construction ---

    function test_VersionAndOwner() public view {
        assertEq(registry.VERSION(), "1.0.0-m2");
        assertEq(registry.owner(), owner);
        assertEq(registry.attestationCount(), 0);
    }

    // --- issuer allowlist ---

    function test_OwnerAddsIssuer_EmitsEvent() public {
        vm.expectEmit(true, false, false, false);
        emit IssuerAdded(issuer);
        registry.addIssuer(issuer);
        assertTrue(registry.isIssuer(issuer));
    }

    function test_OwnerRemovesIssuer_EmitsEvent() public {
        registry.addIssuer(issuer);
        vm.expectEmit(true, false, false, false);
        emit IssuerRemoved(issuer);
        registry.removeIssuer(issuer);
        assertFalse(registry.isIssuer(issuer));
    }

    function test_AddIssuer_RevertsForNonOwner() public {
        vm.prank(other);
        vm.expectRevert(ComplianceRegistry.NotOwner.selector);
        registry.addIssuer(issuer);
    }

    function test_AddIssuer_RevertsWhenAlreadyIssuer() public {
        registry.addIssuer(issuer);
        vm.expectRevert(ComplianceRegistry.AlreadyIssuer.selector);
        registry.addIssuer(issuer);
    }

    function test_RemoveIssuer_RevertsWhenNotIssuer() public {
        vm.expectRevert(ComplianceRegistry.NotAnIssuer.selector);
        registry.removeIssuer(issuer);
    }

    // --- attest ---

    function test_Attest_HappyPath_StoresAndEmits() public {
        registry.addIssuer(issuer);

        vm.expectEmit(true, true, true, true);
        emit Attested(1, issuer, subject, SCHEMA, DATA, uint64(block.timestamp));

        vm.prank(issuer);
        uint256 id = registry.attest(subject, SCHEMA, DATA);

        assertEq(id, 1);
        assertEq(registry.attestationCount(), 1);

        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        assertEq(a.issuer, issuer);
        assertEq(a.subject, subject);
        assertEq(a.schemaId, SCHEMA);
        assertEq(a.dataHash, DATA);
        assertEq(a.issuedAt, uint64(block.timestamp));
        assertEq(a.revokedAt, 0);
        assertTrue(registry.isValid(id));
    }

    function test_Attest_IncrementsIds() public {
        registry.addIssuer(issuer);
        vm.startPrank(issuer);
        uint256 id1 = registry.attest(subject, SCHEMA, DATA);
        uint256 id2 = registry.attest(subject, SCHEMA, keccak256("other-doc"));
        vm.stopPrank();
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(registry.attestationCount(), 2);
    }

    function test_Attest_RevertsForNonIssuer() public {
        vm.prank(other);
        vm.expectRevert(ComplianceRegistry.NotIssuer.selector);
        registry.attest(subject, SCHEMA, DATA);
    }

    function test_Attest_RevertsForZeroSubject() public {
        registry.addIssuer(issuer);
        vm.prank(issuer);
        vm.expectRevert(ComplianceRegistry.ZeroSubject.selector);
        registry.attest(address(0), SCHEMA, DATA);
    }

    function test_Attest_RevertsAfterIssuerRemoved() public {
        registry.addIssuer(issuer);
        registry.removeIssuer(issuer);
        vm.prank(issuer);
        vm.expectRevert(ComplianceRegistry.NotIssuer.selector);
        registry.attest(subject, SCHEMA, DATA);
    }

    // --- revoke ---

    function test_Revoke_HappyPath_EmitsAndInvalidates() public {
        uint256 id = _attestAs(issuer);
        vm.warp(block.timestamp + 100);

        vm.expectEmit(true, true, false, true);
        emit Revoked(id, issuer, uint64(block.timestamp));

        vm.prank(issuer);
        registry.revoke(id);

        assertFalse(registry.isValid(id));
        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        assertEq(a.revokedAt, uint64(block.timestamp));
    }

    function test_Revoke_RevertsForUnknownId() public {
        vm.prank(issuer);
        vm.expectRevert(ComplianceRegistry.UnknownAttestation.selector);
        registry.revoke(999);
    }

    function test_Revoke_RevertsForNonIssuerOfAttestation() public {
        uint256 id = _attestAs(issuer);
        registry.addIssuer(other);
        vm.prank(other);
        vm.expectRevert(ComplianceRegistry.NotAttestationIssuer.selector);
        registry.revoke(id);
    }

    function test_Revoke_RevertsWhenAlreadyRevoked() public {
        uint256 id = _attestAs(issuer);
        vm.prank(issuer);
        registry.revoke(id);
        vm.prank(issuer);
        vm.expectRevert(ComplianceRegistry.AlreadyRevoked.selector);
        registry.revoke(id);
    }

    // --- reads ---

    function test_GetAttestation_RevertsForUnknown() public {
        vm.expectRevert(ComplianceRegistry.UnknownAttestation.selector);
        registry.getAttestation(1);
    }

    function test_IsValid_FalseForUnknown() public view {
        assertFalse(registry.isValid(1));
    }

    // --- fuzz ---

    function testFuzz_AttestStoresData(address subj, bytes32 schema, bytes32 data) public {
        vm.assume(subj != address(0));
        registry.addIssuer(issuer);
        vm.prank(issuer);
        uint256 id = registry.attest(subj, schema, data);
        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        assertEq(a.subject, subj);
        assertEq(a.schemaId, schema);
        assertEq(a.dataHash, data);
        assertTrue(registry.isValid(id));
    }

    // --- helpers ---

    function _attestAs(address who) internal returns (uint256 id) {
        registry.addIssuer(who);
        vm.prank(who);
        id = registry.attest(subject, SCHEMA, DATA);
    }
}
