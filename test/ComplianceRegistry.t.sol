// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";

/// @notice M1 eval/harness — intentionally empty of feature tests.
/// @dev One sanity check only: the skeleton deploys and reports its version.
///      Feature tests (attestation submit/verify/revoke, access control) are
///      added alongside the M2 core build. Keep this harness green at all times.
contract ComplianceRegistryTest is Test {
    ComplianceRegistry internal registry;

    function setUp() public {
        registry = new ComplianceRegistry();
    }

    /// @notice Skeleton smoke test: deploys and exposes the expected version.
    function test_SkeletonDeploys() public view {
        assertEq(registry.VERSION(), "0.1.0-m1-skeleton");
    }
}
