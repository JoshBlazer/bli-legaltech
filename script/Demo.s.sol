// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console2 } from "forge-std/Script.sol";
import { ComplianceRegistry } from "../src/ComplianceRegistry.sol";

/// @title Demo
/// @notice Walks the full Attestry v2 flow end-to-end so judges (and CI) can see
///         it work without a frontend: deploy -> register a demo schema ->
///         allow-list a demo issuer -> record attestations (direct + EIP-712
///         delegated, with expiry + Semaphore id commitment) -> verify status ->
///         revoke with a reason -> anchor a Merkle checkpoint.
/// @dev Keyless by default. Run as a local simulation (no RPC, no keys):
///          forge script script/Demo.s.sol -vvv
///      To exercise a real chain later, the OPERATOR supplies env vars and runs:
///          forge script script/Demo.s.sol --rpc-url $SEPOLIA_RPC_URL \
///              --private-key $DEPLOYER_PRIVATE_KEY --broadcast
///      Testnet + burner wallet only. Never mainnet, never a key with real funds.
contract Demo is Script {
    function run() external {
        // A deterministic demo issuer key so the EIP-712 leg is reproducible in
        // the keyless local simulation. NOT a real key; never holds funds.
        uint256 demoIssuerPk = 0xA11CE;
        address demoIssuer = vm.addr(demoIssuerPk);

        vm.startBroadcast();

        // 1. Deploy the registry. The deployer becomes the owner.
        ComplianceRegistry registry = new ComplianceRegistry();
        console2.log("Registry deployed at:", address(registry));
        console2.log("Version:", registry.VERSION());

        // 2. Register a demo compliance schema (anyone may register).
        bytes32 schemaId =
            registry.registerSchema("KYC/AML v1", "ipfs://attestry/schemas/kyc-aml-v1.json");
        console2.log("Schema registered. id:");
        console2.logBytes32(schemaId);

        // 3. Owner allow-lists two issuers: the broadcasting deployer (direct
        //    attest) and the deterministic demo issuer (EIP-712 delegated).
        address directIssuer = msg.sender;
        registry.addIssuer(directIssuer);
        registry.addIssuer(demoIssuer);
        console2.log("Issuers allow-listed:", directIssuer, demoIssuer);

        // 4. Direct attestation: subject, schema, doc hash, 1-year expiry, and a
        //    Semaphore identity commitment enabling the later ZK private proof.
        address subject = address(0xBEEF);
        bytes32 dataHash = keccak256("hash-of-the-signed-compliance-report");
        uint64 expiry = uint64(block.timestamp + 365 days);
        uint256 idCommitment = uint256(keccak256("subject-semaphore-commitment"));
        uint256 id1 = registry.attest(subject, schemaId, dataHash, expiry, idCommitment);
        console2.log("Direct attestation recorded. id:", id1);
        console2.log("isValid(id1):", registry.isValid(id1));

        vm.stopBroadcast();

        // 5. Delegated (EIP-712) attestation: the demo issuer signs off-chain and
        //    anyone submits. Built + signed in a helper to keep the stack shallow.
        uint256 id2 = _delegatedAttest(registry, schemaId, demoIssuerPk, demoIssuer);
        console2.log("Delegated (EIP-712) attestation recorded. id:", id2);
        console2.log("isValid(id2):", registry.isValid(id2));

        vm.startBroadcast();

        // 6. Issuer revokes the first attestation with a reason; trail preserved.
        registry.revoke(id1, keccak256("superseded"));
        console2.log("Revoked id1. status (2=Revoked):", uint8(registry.status(id1)));

        // 7. Owner anchors a Merkle checkpoint of the attestation leaves.
        uint256 ckpt = registry.checkpoint(keccak256("demo-merkle-root"));
        console2.log("Checkpoint anchored. index:", ckpt);

        vm.stopBroadcast();

        console2.log("--- Demo complete: 2 attestations, 1 revoked, 1 checkpoint ---");
    }

    /// @dev Builds, signs (EIP-712), and submits a delegated attestation. Kept
    ///      out of `run()` so the signing locals don't blow the stack.
    function _delegatedAttest(
        ComplianceRegistry registry,
        bytes32 schemaId,
        uint256 issuerPk,
        address issuer
    ) internal returns (uint256 id) {
        ComplianceRegistry.AttestationRequest memory req =
            ComplianceRegistry.AttestationRequest({
                issuer: issuer,
                subject: address(0xCAFE),
                schemaId: schemaId,
                dataHash: keccak256("hash-of-a-second-report"),
                expiry: 0, // never expires
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
