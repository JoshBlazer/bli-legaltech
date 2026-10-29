// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { ComplianceRegistry } from "../src/ComplianceRegistry.sol";

/// @notice Full eval/harness for the Attestry v2 core: schema registry, direct
///         attest (with expiry + idCommitment), EIP-712 delegated attestWithSig,
///         revoke-with-reason, the Status enum, Merkle checkpoints, access
///         control, events, and fuzz.
contract ComplianceRegistryTest is Test {
    ComplianceRegistry internal registry;

    address internal owner = address(this);
    address internal issuer;
    uint256 internal issuerPk;
    address internal other = makeAddr("other");
    address internal subject = makeAddr("subject");

    bytes32 internal constant DATA = keccak256("document-contents");
    bytes32 internal constant REASON = keccak256("fraud");

    bytes32 internal schemaId; // registered in setUp by `issuer`

    // Mirror the contract events so expectEmit can match them.
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event SchemaRegistered(
        bytes32 indexed schemaId, address indexed registrar, string name, string uri
    );
    event Attested(
        uint256 indexed id,
        address indexed issuer,
        address indexed subject,
        bytes32 schemaId,
        bytes32 dataHash,
        uint64 issuedAt,
        uint64 expiry,
        uint256 idCommitment
    );
    event Revoked(uint256 indexed id, address indexed issuer, uint64 revokedAt, bytes32 reasonCode);
    event Checkpoint(uint256 indexed index, bytes32 root, uint64 at);

    function setUp() public {
        (issuer, issuerPk) = makeAddrAndKey("issuer");
        registry = new ComplianceRegistry();
        vm.prank(issuer);
        schemaId = registry.registerSchema("KYC/AML v1", "ipfs://schema");
    }

    // --- metadata / construction ---

    function test_VersionAndOwner() public view {
        assertEq(registry.VERSION(), "2.0.0");
        assertEq(registry.owner(), owner);
        assertEq(registry.attestationCount(), 0);
        assertEq(registry.checkpointCount(), 0);
    }

    // --- schema registry ---

    function test_RegisterSchema_StoresAndEmits() public {
        bytes32 expected = keccak256(abi.encode("passport-check", other));
        vm.expectEmit(true, true, false, true);
        emit SchemaRegistered(expected, other, "passport-check", "https://x/y");

        vm.prank(other);
        bytes32 id = registry.registerSchema("passport-check", "https://x/y");
        assertEq(id, expected);

        (string memory name, string memory uri, address registrar) = registry.getSchema(id);
        assertEq(name, "passport-check");
        assertEq(uri, "https://x/y");
        assertEq(registrar, other);
        assertTrue(registry.schemaExists(id));
    }

    function test_RegisterSchema_IdBoundToRegistrar() public {
        vm.prank(other);
        bytes32 a = registry.registerSchema("same-name", "u1");
        vm.prank(subject);
        bytes32 b = registry.registerSchema("same-name", "u2");
        assertTrue(a != b, "same name from different registrars must differ");
    }

    function test_RegisterSchema_RevertsOnDuplicate() public {
        vm.prank(other);
        registry.registerSchema("dup", "u");
        vm.prank(other);
        vm.expectRevert(ComplianceRegistry.SchemaExists.selector);
        registry.registerSchema("dup", "u2");
    }

    function test_RegisterSchema_RevertsOnEmptyName() public {
        vm.expectRevert(ComplianceRegistry.EmptySchemaName.selector);
        registry.registerSchema("", "u");
    }

    function test_GetSchema_RevertsForUnknown() public {
        vm.expectRevert(ComplianceRegistry.UnknownSchema.selector);
        registry.getSchema(keccak256("nope"));
    }

    function test_ComputeSchemaId_MatchesRegistration() public view {
        assertEq(registry.computeSchemaId("KYC/AML v1", issuer), schemaId);
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

    // --- attest (direct) ---

    function test_Attest_HappyPath_StoresAndEmits() public {
        registry.addIssuer(issuer);
        uint64 expiry = uint64(block.timestamp + 365 days);
        uint256 idc = 12345;

        vm.expectEmit(true, true, true, true);
        emit Attested(1, issuer, subject, schemaId, DATA, uint64(block.timestamp), expiry, idc);

        vm.prank(issuer);
        uint256 id = registry.attest(subject, schemaId, DATA, expiry, idc);

        assertEq(id, 1);
        assertEq(registry.attestationCount(), 1);

        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        assertEq(a.issuer, issuer);
        assertEq(a.subject, subject);
        assertEq(a.schemaId, schemaId);
        assertEq(a.dataHash, DATA);
        assertEq(a.issuedAt, uint64(block.timestamp));
        assertEq(a.expiry, expiry);
        assertEq(a.revokedAt, 0);
        assertEq(a.idCommitment, idc);
        assertEq(a.reasonCode, bytes32(0));
        assertTrue(registry.isValid(id));
        assertEq(uint8(registry.status(id)), uint8(ComplianceRegistry.Status.Valid));
    }

    function test_Attest_NoExpiryNoCommitment() public {
        registry.addIssuer(issuer);
        vm.prank(issuer);
        uint256 id = registry.attest(subject, schemaId, DATA, 0, 0);
        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        assertEq(a.expiry, 0);
        assertEq(a.idCommitment, 0);
        assertTrue(registry.isValid(id));
    }

    function test_Attest_IncrementsIds() public {
        registry.addIssuer(issuer);
        vm.startPrank(issuer);
        uint256 id1 = registry.attest(subject, schemaId, DATA, 0, 0);
        uint256 id2 = registry.attest(subject, schemaId, keccak256("other-doc"), 0, 7);
        vm.stopPrank();
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(registry.attestationCount(), 2);
    }

    function test_Attest_RevertsForNonIssuer() public {
        vm.prank(other);
        vm.expectRevert(ComplianceRegistry.NotIssuer.selector);
        registry.attest(subject, schemaId, DATA, 0, 0);
    }

    function test_Attest_RevertsForZeroSubject() public {
        registry.addIssuer(issuer);
        vm.prank(issuer);
        vm.expectRevert(ComplianceRegistry.ZeroSubject.selector);
        registry.attest(address(0), schemaId, DATA, 0, 0);
    }

    function test_Attest_RevertsAfterIssuerRemoved() public {
        registry.addIssuer(issuer);
        registry.removeIssuer(issuer);
        vm.prank(issuer);
        vm.expectRevert(ComplianceRegistry.NotIssuer.selector);
        registry.attest(subject, schemaId, DATA, 0, 0);
    }

    // --- status / expiry ---

    function test_Status_ExpiresAtExpiryTimestamp() public {
        registry.addIssuer(issuer);
        uint64 expiry = uint64(block.timestamp + 100);
        vm.prank(issuer);
        uint256 id = registry.attest(subject, schemaId, DATA, expiry, 0);

        assertEq(uint8(registry.status(id)), uint8(ComplianceRegistry.Status.Valid));
        assertTrue(registry.isValid(id));

        vm.warp(expiry); // exactly at expiry -> expired
        assertEq(uint8(registry.status(id)), uint8(ComplianceRegistry.Status.Expired));
        assertFalse(registry.isValid(id));
    }

    function test_Status_UnknownForUnissued() public view {
        assertEq(uint8(registry.status(999)), uint8(ComplianceRegistry.Status.Unknown));
    }

    function test_Status_RevokedBeatsExpired() public {
        registry.addIssuer(issuer);
        uint64 expiry = uint64(block.timestamp + 100);
        vm.prank(issuer);
        uint256 id = registry.attest(subject, schemaId, DATA, expiry, 0);
        vm.prank(issuer);
        registry.revoke(id, REASON);
        vm.warp(expiry + 1000); // also past expiry
        assertEq(uint8(registry.status(id)), uint8(ComplianceRegistry.Status.Revoked));
    }

    // --- revoke ---

    function test_Revoke_HappyPath_EmitsAndInvalidates() public {
        uint256 id = _attestAs(issuer);
        vm.warp(block.timestamp + 100);

        vm.expectEmit(true, true, false, true);
        emit Revoked(id, issuer, uint64(block.timestamp), REASON);

        vm.prank(issuer);
        registry.revoke(id, REASON);

        assertFalse(registry.isValid(id));
        assertEq(uint8(registry.status(id)), uint8(ComplianceRegistry.Status.Revoked));
        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        assertEq(a.revokedAt, uint64(block.timestamp));
        assertEq(a.reasonCode, REASON);
    }

    function test_Revoke_RevertsForUnknownId() public {
        vm.prank(issuer);
        vm.expectRevert(ComplianceRegistry.UnknownAttestation.selector);
        registry.revoke(999, REASON);
    }

    function test_Revoke_RevertsForNonIssuerOfAttestation() public {
        uint256 id = _attestAs(issuer);
        registry.addIssuer(other);
        vm.prank(other);
        vm.expectRevert(ComplianceRegistry.NotAttestationIssuer.selector);
        registry.revoke(id, REASON);
    }

    function test_Revoke_RevertsWhenAlreadyRevoked() public {
        uint256 id = _attestAs(issuer);
        vm.prank(issuer);
        registry.revoke(id, REASON);
        vm.prank(issuer);
        vm.expectRevert(ComplianceRegistry.AlreadyRevoked.selector);
        registry.revoke(id, REASON);
    }

    // --- attestWithSig (EIP-712) ---

    function test_AttestWithSig_HappyPath() public {
        registry.addIssuer(issuer);
        uint64 expiry = uint64(block.timestamp + 30 days);
        ComplianceRegistry.AttestationRequest memory req =
            _req(0, uint64(block.timestamp + 1 hours), expiry, 999);
        bytes memory sig = _sign(req, issuerPk);

        vm.expectEmit(true, true, true, true);
        emit Attested(1, issuer, subject, schemaId, DATA, uint64(block.timestamp), expiry, 999);

        vm.prank(other); // anyone may submit
        uint256 id = registry.attestWithSig(req, sig);

        assertEq(id, 1);
        assertEq(registry.nonces(issuer), 1);
        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        assertEq(a.issuer, issuer);
        assertEq(a.idCommitment, 999);
        assertTrue(registry.isValid(id));
    }

    function test_AttestWithSig_RevertsOnExpiredDeadline() public {
        registry.addIssuer(issuer);
        vm.warp(1000);
        ComplianceRegistry.AttestationRequest memory req =
            _req(0, uint64(block.timestamp - 1), 0, 0);
        bytes memory sig = _sign(req, issuerPk);
        vm.expectRevert(ComplianceRegistry.SignatureExpired.selector);
        registry.attestWithSig(req, sig);
    }

    function test_AttestWithSig_RevertsOnBadNonce() public {
        registry.addIssuer(issuer);
        ComplianceRegistry.AttestationRequest memory req =
            _req(5, uint64(block.timestamp + 1 hours), 0, 0);
        bytes memory sig = _sign(req, issuerPk);
        vm.expectRevert(ComplianceRegistry.InvalidNonce.selector);
        registry.attestWithSig(req, sig);
    }

    function test_AttestWithSig_RevertsWhenSignerNotIssuer() public {
        // issuer not allow-listed
        ComplianceRegistry.AttestationRequest memory req =
            _req(0, uint64(block.timestamp + 1 hours), 0, 0);
        bytes memory sig = _sign(req, issuerPk);
        vm.expectRevert(ComplianceRegistry.NotIssuer.selector);
        registry.attestWithSig(req, sig);
    }

    function test_AttestWithSig_RevertsOnWrongSigner() public {
        registry.addIssuer(issuer);
        (, uint256 wrongPk) = makeAddrAndKey("wrong");
        ComplianceRegistry.AttestationRequest memory req =
            _req(0, uint64(block.timestamp + 1 hours), 0, 0);
        bytes memory sig = _sign(req, wrongPk); // signed by a different key
        vm.expectRevert(ComplianceRegistry.InvalidSignature.selector);
        registry.attestWithSig(req, sig);
    }

    function test_AttestWithSig_RevertsOnTamperedRequest() public {
        registry.addIssuer(issuer);
        ComplianceRegistry.AttestationRequest memory req =
            _req(0, uint64(block.timestamp + 1 hours), 0, 0);
        bytes memory sig = _sign(req, issuerPk);
        req.dataHash = keccak256("tampered"); // mutate after signing
        vm.expectRevert(ComplianceRegistry.InvalidSignature.selector);
        registry.attestWithSig(req, sig);
    }

    function test_AttestWithSig_RevertsOnReplay() public {
        registry.addIssuer(issuer);
        ComplianceRegistry.AttestationRequest memory req =
            _req(0, uint64(block.timestamp + 1 hours), 0, 0);
        bytes memory sig = _sign(req, issuerPk);
        registry.attestWithSig(req, sig);
        // nonce now consumed; resubmitting the same request fails
        vm.expectRevert(ComplianceRegistry.InvalidNonce.selector);
        registry.attestWithSig(req, sig);
    }

    function test_AttestWithSig_SequentialNonces() public {
        registry.addIssuer(issuer);
        ComplianceRegistry.AttestationRequest memory r0 =
            _req(0, uint64(block.timestamp + 1 hours), 0, 0);
        registry.attestWithSig(r0, _sign(r0, issuerPk));
        ComplianceRegistry.AttestationRequest memory r1 =
            _req(1, uint64(block.timestamp + 1 hours), 0, 0);
        registry.attestWithSig(r1, _sign(r1, issuerPk));
        assertEq(registry.nonces(issuer), 2);
        assertEq(registry.attestationCount(), 2);
    }

    function test_AttestWithSig_RevertsOnBadSigLength() public {
        registry.addIssuer(issuer);
        ComplianceRegistry.AttestationRequest memory req =
            _req(0, uint64(block.timestamp + 1 hours), 0, 0);
        vm.expectRevert(ComplianceRegistry.InvalidSignature.selector);
        registry.attestWithSig(req, hex"dead");
    }

    function test_DomainSeparator_Matches() public view {
        bytes32 expected = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("Attestry")),
                keccak256(bytes("2")),
                block.chainid,
                address(registry)
            )
        );
        assertEq(registry.DOMAIN_SEPARATOR(), expected);
    }

    // --- checkpoints ---

    function test_Checkpoint_HappyPath() public {
        bytes32 root1 = keccak256("root-1");
        bytes32 root2 = keccak256("root-2");

        vm.expectEmit(true, false, false, true);
        emit Checkpoint(0, root1, uint64(block.timestamp));
        uint256 i0 = registry.checkpoint(root1);
        assertEq(i0, 0);

        uint256 i1 = registry.checkpoint(root2);
        assertEq(i1, 1);

        assertEq(registry.roots(0), root1);
        assertEq(registry.roots(1), root2);
        assertEq(registry.checkpointCount(), 2);
    }

    function test_Checkpoint_RevertsForNonOwner() public {
        vm.prank(other);
        vm.expectRevert(ComplianceRegistry.NotOwner.selector);
        registry.checkpoint(keccak256("root"));
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

    function testFuzz_AttestStoresData(
        address subj,
        bytes32 schema,
        bytes32 data,
        uint64 expiry,
        uint256 idc
    ) public {
        vm.assume(subj != address(0));
        registry.addIssuer(issuer);
        vm.prank(issuer);
        uint256 id = registry.attest(subj, schema, data, expiry, idc);
        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        assertEq(a.subject, subj);
        assertEq(a.schemaId, schema);
        assertEq(a.dataHash, data);
        assertEq(a.expiry, expiry);
        assertEq(a.idCommitment, idc);
    }

    function testFuzz_ExpiryStatus(uint64 expiry, uint64 warpTo) public {
        vm.assume(expiry > 0);
        registry.addIssuer(issuer);
        vm.prank(issuer);
        uint256 id = registry.attest(subject, schemaId, DATA, expiry, 0);
        vm.warp(warpTo);
        ComplianceRegistry.Status expected =
            warpTo >= expiry ? ComplianceRegistry.Status.Expired : ComplianceRegistry.Status.Valid;
        assertEq(uint8(registry.status(id)), uint8(expected));
    }

    function testFuzz_AttestWithSig(bytes32 data, uint64 expiry, uint256 idc) public {
        registry.addIssuer(issuer);
        ComplianceRegistry.AttestationRequest memory req = ComplianceRegistry.AttestationRequest({
            issuer: issuer,
            subject: subject,
            schemaId: schemaId,
            dataHash: data,
            expiry: expiry,
            idCommitment: idc,
            nonce: 0,
            deadline: uint64(block.timestamp + 1 hours)
        });
        uint256 id = registry.attestWithSig(req, _sign(req, issuerPk));
        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        assertEq(a.issuer, issuer);
        assertEq(a.dataHash, data);
        assertEq(a.idCommitment, idc);
    }

    // --- helpers ---

    function _attestAs(address who) internal returns (uint256 id) {
        registry.addIssuer(who);
        vm.prank(who);
        id = registry.attest(subject, schemaId, DATA, 0, 0);
    }

    function _req(uint256 nonce, uint64 deadline, uint64 expiry, uint256 idc)
        internal
        view
        returns (ComplianceRegistry.AttestationRequest memory)
    {
        return ComplianceRegistry.AttestationRequest({
            issuer: issuer,
            subject: subject,
            schemaId: schemaId,
            dataHash: DATA,
            expiry: expiry,
            idCommitment: idc,
            nonce: nonce,
            deadline: deadline
        });
    }

    function _sign(ComplianceRegistry.AttestationRequest memory req, uint256 pk)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = registry.hashAttestationRequest(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }
}
