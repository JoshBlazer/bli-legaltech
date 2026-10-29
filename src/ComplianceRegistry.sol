// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ComplianceRegistry
/// @notice Attestry core — an on-chain registry for privacy-preserving,
///         independently-verifiable compliance attestations (regtech / legal
///         automation). Allow-listed issuers record tamper-evident attestations
///         (a subject, a registered schema id, and the hash of the underlying
///         document / check result). Anyone can verify an attestation's issuer,
///         timestamp, and status directly against chain state, with no trusted
///         intermediary. Issuers can revoke with a reason, producing a
///         permanent, timestamped audit trail.
/// @dev    v2 adds: a schema registry, expiry + Semaphore identity commitment on
///         attestations, EIP-712 delegated attestation (`attestWithSig`),
///         revoke-with-reason, a three-state `Status` enum, and periodic Merkle
///         root checkpoints for batch verifiability / evidence proofs.
/// @dev    Testnet only. Never deploy to mainnet or hold real funds. The contract
///         stores only hashes and references — never personal data on-chain.
contract ComplianceRegistry {
    /// @notice Human-readable version of the registry.
    string public constant VERSION = "2.0.0";

    /// @notice Lifecycle state of an attestation.
    /// @dev    `Unknown` means the id was never issued. Revocation takes
    ///         precedence over expiry.
    enum Status {
        Unknown,
        Valid,
        Revoked,
        Expired
    }

    /// @notice A single compliance attestation.
    /// @param issuer       The allow-listed address that recorded the attestation.
    /// @param subject      The entity the attestation is about.
    /// @param schemaId     Identifies the attestation type (see schema registry).
    /// @param dataHash     Hash of the off-chain document / check result.
    /// @param issuedAt     Block timestamp when recorded (0 means "does not exist").
    /// @param expiry       Unix time the attestation expires (0 means "never").
    /// @param revokedAt    Block timestamp when revoked (0 means "not revoked").
    /// @param idCommitment Subject's Semaphore identity commitment (0 = no
    ///                     private-proof option). Used off-chain to build the
    ///                     (issuer, schema) ZK membership group.
    /// @param reasonCode   Revocation reason code (0 until revoked).
    struct Attestation {
        address issuer;
        address subject;
        bytes32 schemaId;
        bytes32 dataHash;
        uint64 issuedAt;
        uint64 expiry;
        uint64 revokedAt;
        uint256 idCommitment;
        bytes32 reasonCode;
    }

    /// @notice A registered attestation schema.
    /// @param name      Human-readable schema name (e.g. "KYC/AML v1").
    /// @param uri       Off-chain pointer to the schema definition.
    /// @param registrar Address that registered the schema (0 = unregistered).
    struct Schema {
        string name;
        string uri;
        address registrar;
    }

    /// @notice An off-chain signed request to record an attestation (EIP-712).
    /// @dev    The allow-listed issuer signs this; anyone may submit it on-chain.
    struct AttestationRequest {
        address issuer;
        address subject;
        bytes32 schemaId;
        bytes32 dataHash;
        uint64 expiry;
        uint256 idCommitment;
        uint256 nonce;
        uint64 deadline;
    }

    /// @notice EIP-712 type hash for {AttestationRequest}.
    bytes32 public constant ATTESTATION_REQUEST_TYPEHASH = keccak256(
        "AttestationRequest(address issuer,address subject,bytes32 schemaId,bytes32 dataHash,uint64 expiry,uint256 idCommitment,uint256 nonce,uint64 deadline)"
    );

    bytes32 private constant _EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant _NAME_HASH = keccak256(bytes("Attestry"));
    bytes32 private constant _VERSION_HASH = keccak256(bytes("2"));

    /// @notice Registry owner; manages the issuer allowlist and checkpoints.
    address public immutable owner;

    /// @notice Number of attestations ever recorded; also the latest id.
    uint256 public attestationCount;

    /// @notice Whether an address is an allow-listed issuer.
    mapping(address => bool) public isIssuer;

    /// @notice Per-issuer EIP-712 nonce (monotonic, consumed by attestWithSig).
    mapping(address => uint256) public nonces;

    /// @notice Anchored Merkle roots of the attestation-leaf tree, in order.
    bytes32[] public roots;

    mapping(uint256 => Attestation) private _attestations;
    mapping(bytes32 => Schema) private _schemas;

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

    error NotOwner();
    error NotIssuer();
    error NotAttestationIssuer();
    error UnknownAttestation();
    error AlreadyRevoked();
    error ZeroSubject();
    error AlreadyIssuer();
    error NotAnIssuer();
    error SchemaExists();
    error UnknownSchema();
    error EmptySchemaName();
    error SignatureExpired();
    error InvalidNonce();
    error InvalidSignature();

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

    // ---------------------------------------------------------------------
    // Schema registry
    // ---------------------------------------------------------------------

    /// @notice Register a new attestation schema. Anyone may register schemas;
    ///         the id is bound to the registrar so names never collide globally.
    /// @param name A human-readable name (must be non-empty).
    /// @param uri  An off-chain pointer to the schema definition.
    /// @return schemaId `keccak256(abi.encode(name, msg.sender))`.
    function registerSchema(string calldata name, string calldata uri)
        external
        returns (bytes32 schemaId)
    {
        if (bytes(name).length == 0) revert EmptySchemaName();
        schemaId = keccak256(abi.encode(name, msg.sender));
        if (_schemas[schemaId].registrar != address(0)) revert SchemaExists();
        _schemas[schemaId] = Schema({ name: name, uri: uri, registrar: msg.sender });
        emit SchemaRegistered(schemaId, msg.sender, name, uri);
    }

    /// @notice Read a registered schema. Reverts if it was never registered.
    function getSchema(bytes32 schemaId)
        external
        view
        returns (string memory name, string memory uri, address registrar)
    {
        Schema storage s = _schemas[schemaId];
        if (s.registrar == address(0)) revert UnknownSchema();
        return (s.name, s.uri, s.registrar);
    }

    /// @notice Whether a schema id has been registered.
    function schemaExists(bytes32 schemaId) external view returns (bool) {
        return _schemas[schemaId].registrar != address(0);
    }

    /// @notice Pure helper: compute the id a (name, registrar) pair would get.
    function computeSchemaId(string calldata name, address registrar)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(name, registrar));
    }

    // ---------------------------------------------------------------------
    // Issuer allowlist
    // ---------------------------------------------------------------------

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

    // ---------------------------------------------------------------------
    // Attest
    // ---------------------------------------------------------------------

    /// @notice Record a new attestation directly. Only an allow-listed issuer.
    /// @param subject      The entity the attestation is about.
    /// @param schemaId     The attestation type (see schema registry).
    /// @param dataHash     Hash of the off-chain document / check result.
    /// @param expiry       Unix expiry time; 0 means the attestation never expires.
    /// @param idCommitment Subject's Semaphore identity commitment; 0 opts out of
    ///                     the private-proof flow.
    /// @return id The id of the newly recorded attestation (starts at 1).
    function attest(
        address subject,
        bytes32 schemaId,
        bytes32 dataHash,
        uint64 expiry,
        uint256 idCommitment
    ) external onlyIssuer returns (uint256 id) {
        return _record(msg.sender, subject, schemaId, dataHash, expiry, idCommitment);
    }

    /// @notice Record an attestation from an off-chain, EIP-712-signed request.
    ///         The signer must be an allow-listed issuer; anyone may submit.
    /// @param req The signed request.
    /// @param sig A 65-byte `(r,s,v)` ECDSA signature over the EIP-712 digest.
    /// @return id The id of the newly recorded attestation.
    function attestWithSig(AttestationRequest calldata req, bytes calldata sig)
        external
        returns (uint256 id)
    {
        if (block.timestamp > req.deadline) revert SignatureExpired();
        if (req.nonce != nonces[req.issuer]) revert InvalidNonce();
        if (!isIssuer[req.issuer]) revert NotIssuer();

        bytes32 digest = hashAttestationRequest(req);
        address signer = _recover(digest, sig);
        if (signer == address(0) || signer != req.issuer) revert InvalidSignature();

        unchecked {
            nonces[req.issuer] = req.nonce + 1;
        }
        return _record(
            req.issuer, req.subject, req.schemaId, req.dataHash, req.expiry, req.idCommitment
        );
    }

    function _record(
        address issuer,
        address subject,
        bytes32 schemaId,
        bytes32 dataHash,
        uint64 expiry,
        uint256 idCommitment
    ) private returns (uint256 id) {
        if (subject == address(0)) revert ZeroSubject();
        id = ++attestationCount;
        uint64 ts = uint64(block.timestamp);
        _attestations[id] = Attestation({
            issuer: issuer,
            subject: subject,
            schemaId: schemaId,
            dataHash: dataHash,
            issuedAt: ts,
            expiry: expiry,
            revokedAt: 0,
            idCommitment: idCommitment,
            reasonCode: bytes32(0)
        });
        emit Attested(id, issuer, subject, schemaId, dataHash, ts, expiry, idCommitment);
    }

    // ---------------------------------------------------------------------
    // Revoke
    // ---------------------------------------------------------------------

    /// @notice Revoke an attestation with a reason code. Only the issuing
    ///         address may revoke. The record is preserved; its status flips.
    /// @param id         The attestation to revoke.
    /// @param reasonCode A machine-readable reason (e.g. keccak256 of a label).
    function revoke(uint256 id, bytes32 reasonCode) external {
        Attestation storage a = _attestations[id];
        if (a.issuedAt == 0) revert UnknownAttestation();
        if (msg.sender != a.issuer) revert NotAttestationIssuer();
        if (a.revokedAt != 0) revert AlreadyRevoked();
        uint64 ts = uint64(block.timestamp);
        a.revokedAt = ts;
        a.reasonCode = reasonCode;
        emit Revoked(id, msg.sender, ts, reasonCode);
    }

    // ---------------------------------------------------------------------
    // Reads / status
    // ---------------------------------------------------------------------

    /// @notice Read a stored attestation. Reverts if it does not exist.
    function getAttestation(uint256 id) external view returns (Attestation memory) {
        Attestation memory a = _attestations[id];
        if (a.issuedAt == 0) revert UnknownAttestation();
        return a;
    }

    /// @notice The lifecycle status of an attestation. Revocation beats expiry.
    function status(uint256 id) public view returns (Status) {
        Attestation storage a = _attestations[id];
        if (a.issuedAt == 0) return Status.Unknown;
        if (a.revokedAt != 0) return Status.Revoked;
        if (a.expiry != 0 && block.timestamp >= a.expiry) return Status.Expired;
        return Status.Valid;
    }

    /// @notice Convenience check: is the attestation currently valid?
    function isValid(uint256 id) external view returns (bool) {
        return status(id) == Status.Valid;
    }

    // ---------------------------------------------------------------------
    // Merkle checkpoints
    // ---------------------------------------------------------------------

    /// @notice Anchor a Merkle root over the attestation leaves for batch
    ///         verifiability and evidence proofs. Owner only.
    /// @param root The Merkle root to anchor.
    /// @return index The sequential index assigned to this root.
    function checkpoint(bytes32 root) external onlyOwner returns (uint256 index) {
        index = roots.length;
        roots.push(root);
        emit Checkpoint(index, root, uint64(block.timestamp));
    }

    /// @notice Number of checkpoints recorded.
    function checkpointCount() external view returns (uint256) {
        return roots.length;
    }

    // ---------------------------------------------------------------------
    // EIP-712 helpers
    // ---------------------------------------------------------------------

    /// @notice The current EIP-712 domain separator (recomputed per chain id).
    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                _EIP712_DOMAIN_TYPEHASH, _NAME_HASH, _VERSION_HASH, block.chainid, address(this)
            )
        );
    }

    /// @notice The full EIP-712 digest for an {AttestationRequest}. Sign this.
    function hashAttestationRequest(AttestationRequest calldata req) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_REQUEST_TYPEHASH,
                req.issuer,
                req.subject,
                req.schemaId,
                req.dataHash,
                req.expiry,
                req.idCommitment,
                req.nonce,
                req.deadline
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
    }

    function _recover(bytes32 digest, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        // Reject the upper range of s to guard against signature malleability.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return address(0);
        }
        if (v != 27 && v != 28) return address(0);
        return ecrecover(digest, v, r, s);
    }
}
