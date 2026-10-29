"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { short } from "@/lib/format";

export function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        className="btn btn-ghost"
        onClick={() => disconnect()}
        title={`${address}${chain ? ` · ${chain.name}` : ""}`}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "var(--ok)",
            display: "inline-block",
          }}
        />
        <span className="mono">{short(address)}</span>
      </button>
    );
  }

  return (
    <button
      className="btn"
      disabled={isPending}
      onClick={() => connect({ connector: injected() })}
    >
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
