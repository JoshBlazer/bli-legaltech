// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console2 } from "forge-std/Script.sol";
import { ComplianceRegistry } from "../src/ComplianceRegistry.sol";

/// @title Seed
/// @notice Seeds demo data into an ALREADY-DEPLOYED ComplianceRegistry so the
///         live dApp has something to show: a schema, two allow-listed issuers,
///         two attestations (one direct, one EIP-712 delegated), one revocation,
///         and a Merkle checkpoint. Mirrors the post-deploy half of Demo.s.sol.
/// @dev    The registry address is read from the REGISTRY env var. The owner key
///         (the deployer / broadcaster) must be the registry owner. Testnet +
///         burner only. Run:
///             forge script script/Seed.s.sol --rpc-url <url> \
///                 --private-key <burner> --broadcast
contract Seed is Script {
    function run() external {
        ComplianceRegistry registry = ComplianceRegistry(vm.envAddress("REGISTRY"));

        // Deterministic demo issuer key so the EIP-712 leg is reproducible.
        uint256 demoIssuerPk = 0xA11CE;
        address demoIssuer = vm.addr(demoIssuerPk);

        vm.startBroadcast();

        bytes32 schemaId =
            registry.registerSchema("KYC/AML v1", "ipfs://attestry/schemas/kyc-aml-v1.json");
        console2.log("Schema registered. id:");
        console2.logBytes32(schemaId);

        address directIssuer = msg.sender;
        registry.addIssuer(directIssuer);
        registry.addIssuer(demoIssuer);
        console2.log("Issuers allow-listed:", directIssuer, demoIssuer);

        address subject = address(0xBEEF);
        bytes32 dataHash = keccak256("hash-of-the-signed-compliance-report");
        uint64 expiry = uint64(block.timestamp + 365 days);
        uint256 idCommitment = uint256(keccak256("subject-semaphore-commitment"));
        uint256 id1 = registry.attest(subject, schemaId, dataHash, expiry, idCommitment);
        console2.log("Direct attestation recorded. id:", id1);

        vm.stopBroadcast();

        uint256 id2 = _delegatedAttest(registry, schemaId, demoIssuerPk, demoIssuer);
        console2.log("Delegated (EIP-712) attestation recorded. id:", id2);

        vm.startBroadcast();

        registry.revoke(id1, keccak256("superseded"));
        console2.log("Revoked id1. status (2=Revoked):", uint8(registry.status(id1)));

        uint256 ckpt = registry.checkpoint(keccak256("demo-merkle-root"));
        console2.log("Checkpoint anchored. index:", ckpt);

        vm.stopBroadcast();

        console2.log("--- Seed complete: 2 attestations, 1 revoked, 1 checkpoint ---");
    }

    function _delegatedAttest(
        ComplianceRegistry registry,
        bytes32 schemaId,
        uint256 issuerPk,
        address issuer
    ) internal returns (uint256 id) {
        ComplianceRegistry.AttestationRequest memory req = ComplianceRegistry.AttestationRequest({
            issuer: issuer,
            subject: address(0xCAFE),
            schemaId: schemaId,
            dataHash: keccak256("hash-of-a-second-report"),
            expiry: 0,
            idCommitment: uint256(keccak256("second-subject-commitment")),
            nonce: 0,
            deadline: uint64(block.timestamp + 1 hours)
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(issuerPk, registry.hashAttestationRequest(req));
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.startBroadcast();
        id = registry.attestWithSig(req, sig);
        vm.stopBroadcast();
    }
}
