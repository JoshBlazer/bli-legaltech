// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console2 } from "forge-std/Script.sol";
import { ComplianceRegistry } from "../src/ComplianceRegistry.sol";

/// @title Demo
/// @notice Walks the full Attestry flow end-to-end so judges (and CI) can see
///         it work without a frontend: deploy -> allowlist an issuer -> record
///         an attestation -> verify -> revoke -> verify again.
/// @dev Keyless by default. Run as a local simulation (no RPC, no keys):
///          forge script script/Demo.s.sol -vvv
///      To exercise a real chain later, the OPERATOR supplies env vars and runs:
///          forge script script/Demo.s.sol --rpc-url $SEPOLIA_RPC_URL \
///              --private-key $DEPLOYER_PRIVATE_KEY --broadcast
///      Testnet + burner wallet only. Never mainnet, never a key with real funds.
contract Demo is Script {
    function run() external {
        vm.startBroadcast();

        // 1. Deploy the registry. The deployer becomes the owner.
        ComplianceRegistry registry = new ComplianceRegistry();
        console2.log("Registry deployed at:", address(registry));
        console2.log("Version:", registry.VERSION());

        // 2. Owner allow-lists a compliance issuer (e.g. a KYC provider).
        address issuer = msg.sender; // in the simulation, deployer acts as issuer
        registry.addIssuer(issuer);
        console2.log("Issuer allow-listed:", issuer);

        // 3. Issuer records an attestation about a subject.
        address subject = address(0xBEEF);
        bytes32 schemaId = keccak256("kyc-aml-v1");
        bytes32 dataHash = keccak256("hash-of-the-signed-compliance-report");
        uint256 id = registry.attest(subject, schemaId, dataHash);
        console2.log("Attestation recorded. id:", id);
        console2.log("Subject:", subject);

        // 4. Anyone verifies it against chain state.
        console2.log("isValid(id) after attest:", registry.isValid(id));

        // 5. Issuer revokes it; the audit trail is preserved.
        registry.revoke(id);
        console2.log("isValid(id) after revoke:", registry.isValid(id));

        ComplianceRegistry.Attestation memory a = registry.getAttestation(id);
        console2.log("Record still readable. issuedAt:", a.issuedAt);
        console2.log("Record revokedAt:", a.revokedAt);

        vm.stopBroadcast();
    }
}
