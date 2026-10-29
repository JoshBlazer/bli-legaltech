// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Attestry on-chain membership verification (bonus / optional path)
/// @notice The Attestry v2 ZK scheme is verified OFF-CHAIN in the dApp via
///         `@semaphore-protocol/proof` (see `lib/zk`). This file is the optional
///         on-chain leg: a thin, dependency-free scaffold that forwards a
///         Semaphore v4 Groth16 proof to a deployed, audited Semaphore verifier.
///
///         It intentionally does NOT embed its own verifying key — reimplementing
///         the pairing check would be unaudited and circuit-depth specific. Point
///         it at the canonical `SemaphoreVerifier` shipped by
///         `@semaphore-protocol/contracts`, which carries the verifying keys for
///         every supported tree depth.
///
/// @dev Public signal order matches the off-chain proof exactly:
///      [ merkleTreeRoot, nullifier, hash(message), hash(scope) ].
///      The JS proof's `points` (uint256[8], produced by @zk-kit `packGroth16Proof`)
///      unpacks into (pA, pB, pC) with this library's documented layout:
///        points = [ pA.x, pA.y,
///                   pB.x1, pB.x0,  pB.y1, pB.y0,     // note: pB coordinates are swapped
///                   pC.x, pC.y ].

/// @notice Canonical Semaphore v4 Groth16 verifier interface.
interface ISemaphoreVerifier {
    function verifyProof(
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[4] calldata publicSignals,
        uint256 merkleTreeDepth
    ) external view returns (bool);
}

/// @notice Forwards an Attestry membership proof to a deployed Semaphore verifier.
contract AttestryMembershipVerifier {
    ISemaphoreVerifier public immutable verifier;

    constructor(ISemaphoreVerifier _verifier) {
        verifier = _verifier;
    }

    /// @notice Verify a selective-disclosure membership proof on-chain.
    /// @param merkleTreeRoot  the (issuer, schema) group root the proof targets
    /// @param nullifier       anti-replay nullifier (bind per scope off-chain)
    /// @param message         the signal, already hashed as Semaphore's hash(message)
    /// @param scope           the scope, already hashed as Semaphore's hash(scope)
    /// @param points          the JS proof's `points` array (uint256[8])
    /// @param merkleTreeDepth the circuit depth used to generate the proof
    function verifyMembership(
        uint256 merkleTreeRoot,
        uint256 nullifier,
        uint256 message,
        uint256 scope,
        uint256[8] calldata points,
        uint256 merkleTreeDepth
    ) external view returns (bool) {
        uint256[2] memory pA = [points[0], points[1]];
        // pB coordinates are swapped to match snarkjs/@zk-kit packing.
        uint256[2][2] memory pB = [[points[2], points[3]], [points[4], points[5]]];
        uint256[2] memory pC = [points[6], points[7]];
        uint256[4] memory publicSignals = [merkleTreeRoot, nullifier, message, scope];
        return verifier.verifyProof(pA, pB, pC, publicSignals, merkleTreeDepth);
    }
}
