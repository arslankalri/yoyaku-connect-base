import type { AgentContext } from "@/lib/nagi-agent.server";
import { contextForBusinessId } from "@/lib/nagi-agent.server";
import type { AuthedClient } from "@/lib/nagi-data.server";

export async function contextForAuthenticatedBusiness(
  supabase: AuthedClient,
  businessId: string,
): Promise<AgentContext> {
  return contextForBusinessId(supabase, businessId);
}
