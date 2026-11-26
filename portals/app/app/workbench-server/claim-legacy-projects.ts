/** Explicit operator backfill using the owner's existing product session. */
import { authorizePinnedAccess } from "./identity";
import { runtimeFor } from "./host";
import { getAuthContext } from "../auth/lib/session";
import { getOidcConfig } from "../auth/lib/config";
import { resolveDisplayProfile } from "../auth/lib/profile";

async function main() {
  const sessionId = process.env.BID_OWNER_SESSION_ID;
  if (!sessionId) throw Error("Set BID_OWNER_SESSION_ID to the owner's product session");
  const cfg = getOidcConfig();
  const context = await getAuthContext(cfg, sessionId);
  if (!context?.user.activeOrg || !context.user.activeWorkspace) throw Error("Owner session unavailable");
  const principal = { sessionId, sub: context.user.sub, orgId: context.user.activeOrg, workspaceId: context.user.activeWorkspace };
  const access = await authorizePinnedAccess(principal);
  const profile = await resolveDisplayProfile(cfg, sessionId, context);
  const name = profile.displayName || profile.account;
  if (!name) throw Error("Owner display profile unavailable");
  const service = runtimeFor(principal);
  try {
    await service.run(access, async () => {
      const projects = await service.listProjects();
      const ids = projects.filter((project) => !project.owner && !project.creator).map((project) => project.id);
      await service.claimLegacyProjects(ids, name);
      console.log(JSON.stringify({ assigned: ids.length, owner: name }));
    });
  } finally { service.close(); }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "Backfill failed"); process.exitCode = 1; });
