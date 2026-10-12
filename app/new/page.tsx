import { requireUser } from "@/lib/session";
import { Shell } from "@/components/shell";
import { NewFlow } from "./flow";

export default async function New() {
  const { user } = await requireUser();
  return (
    <Shell email={user.email}>
      <h1 className="text-2xl font-bold">Subir documento</h1>
      <NewFlow />
    </Shell>
  );
}
