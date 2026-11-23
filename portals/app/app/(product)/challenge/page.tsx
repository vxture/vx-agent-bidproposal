import { notFound } from "next/navigation";
import { isDeployedStage } from "../../lib/deploy-stage";
import Challenge from "../deck/challenge";

export const dynamic = "force-dynamic";

export default function ChallengePage() {
  if (isDeployedStage()) notFound();
  return <Challenge />;
}
