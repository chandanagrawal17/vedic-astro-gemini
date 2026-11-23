import { UnlockPaywallClient } from "@/components/blueprint/UnlockPaywallClient";
import { getBetaUnlockMode } from "@/lib/payments/provider";

export const dynamic = "force-dynamic";

export default function UnlockPaywallPage() {
  const betaUnlockMode = getBetaUnlockMode();
  return <UnlockPaywallClient betaUnlockMode={betaUnlockMode} />;
}
