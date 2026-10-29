// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ComplianceRegistry
/// @notice Attestry core — an on-chain registry for compliance attestations
///         (regtech / legal-automation workflow). Allow-listed issuers record
///         tamper-evident attestations (a subject, a schema id, and the hash of
///         the underlying document / check result). Anyone can then verify an
///         attestation's issuer, timestamp, and status directly against chain
///         state, with no trusted intermediary. Issuers can revoke, producing a
///         permanent, timestamped audit trail.
/// @dev Testnet only. Never deploy to mainnet or hold real funds. The contract
///      stores only hashes and references — never personal data on-chain.
contract ComplianceRegistry {
    /// @notice Human-readable version of the registry.
    string public constant VERSION = "1.0.0-m2";

    /// @notice A single compliance attestation.
    /// @param issuer    The allow-listed address that recorded the attestation.
    /// @param subject   The entity the attestation is about.
    /// @param schemaId  Identifies the attestation type (e.g. a KYC/AML schema).
    /// @param dataHash  Hash of the off-chain document / check result.
    /// @param issuedAt  Block timestamp when recorded (0 means "does not exist").
    /// @param revokedAt Block timestamp when revoked (0 means "still valid").
    struct Attestation {
        address issuer;
        address subject;
        bytes32 schemaId;
        bytes32 dataHash;
        uint64 issuedAt;
        uint64 revokedAt;
    }

    /// @notice Registry owner; manages the issuer allowlist.
    address public immutable owner;

    /// @notice Number of attestations ever recorded; also the latest id.
    uint256 public attestationCount;

    /// @notice Whether an address is an allow-listed issuer.
    mapping(address => bool) public isIssuer;

    mapping(uint256 => Attestation) private _attestations;

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

    error NotOwner();
    error NotIssuer();
    error NotAttestationIssuer();
    error UnknownAttestation();
    error AlreadyRevoked();
    error ZeroSubject();
    error AlreadyIssuer();
    error NotAnIssuer();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyIssuer() {
        if (!isIssuer[msg.sender]) revert NotIssuer();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Add an address to the issuer allowlist.
    function addIssuer(address issuer) external onlyOwner {
        if (isIssuer[issuer]) revert AlreadyIssuer();
        isIssuer[issuer] = true;
        emit IssuerAdded(issuer);
    }

    /// @notice Remove an address from the issuer allowlist. Existing
    ///         attestations remain on-chain and verifiable.
    function removeIssuer(address issuer) external onlyOwner {
        if (!isIssuer[issuer]) revert NotAnIssuer();
        isIssuer[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /// @notice Record a new attestation. Only callable by an allow-listed issuer.
    /// @return id The id of the newly recorded attestation (starts at 1).
    function attest(address subject, bytes32 schemaId, bytes32 dataHash)
        external
        onlyIssuer
        returns (uint256 id)
    {
        if (subject == address(0)) revert ZeroSubject();
        id = ++attestationCount;
        uint64 ts = uint64(block.timestamp);
        _attestations[id] = Attestation({
            issuer: msg.sender,
            subject: subject,
            schemaId: schemaId,
            dataHash: dataHash,
            issuedAt: ts,
            revokedAt: 0
        });
        emit Attested(id, msg.sender, subject, schemaId, dataHash, ts);
    }

    /// @notice Revoke an attestation. Only the issuing address may revoke it.
    ///         The record is preserved; its status flips to revoked.
    function revoke(uint256 id) external {
        Attestation storage a = _attestations[id];
        if (a.issuedAt == 0) revert UnknownAttestation();
        if (msg.sender != a.issuer) revert NotAttestationIssuer();
        if (a.revokedAt != 0) revert AlreadyRevoked();
        uint64 ts = uint64(block.timestamp);
        a.revokedAt = ts;
        emit Revoked(id, msg.sender, ts);
    }

    /// @notice Read a stored attestation. Reverts if it does not exist.
    function getAttestation(uint256 id) external view returns (Attestation memory) {
        Attestation memory a = _attestations[id];
        if (a.issuedAt == 0) revert UnknownAttestation();
        return a;
    }

    /// @notice Convenience check: does the attestation exist and remain unrevoked?
    function isValid(uint256 id) external view returns (bool) {
        Attestation storage a = _attestations[id];
        return a.issuedAt != 0 && a.revokedAt == 0;
    }
}
