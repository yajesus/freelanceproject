// app/clicker/layout.tsx

"use client";

import { WALLET_LIST, WALLET_MANIFEST_URL } from "@/utils/consts";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

export default function MyApp({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div id="modal"></div>
      <div id="comeback-modal"></div>
      <TonConnectUIProvider
        manifestUrl={WALLET_MANIFEST_URL}
        walletsListConfiguration={{
          includeWallets: WALLET_LIST,
        }}
      >
        {children}
      </TonConnectUIProvider>
    </>
  );
}
