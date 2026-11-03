import { z } from "zod";
import type { PoolClient } from "pg";
import { audit } from "./db";
import { AppError, type Actor } from "./service";
const person = z.object({
  name: z.string().trim().max(150),
  email: z.union([z.email(), z.literal("")]),
  phone: z.string().trim().max(50),
});
export const profileSchema = z.object({
  president: person,
  representative: person,
  notificationEmail: z.union([z.email(), z.literal("")]),
});
export async function updateContacts(
  db: PoolClient,
  actor: Actor,
  input: unknown,
) {
  const b = z
    .object({
      accountId: z.uuid().optional(),
      revision: z.number().int().positive(),
      profile: profileSchema,
    })
    .parse(input);
  const id = b.accountId ?? actor.id;
  if (actor.role !== "admin" && id !== actor.id)
    throw new AppError("You can only update your society’s contacts.", 403);
  const {
    rows: [a],
  } = await db.query(
    "UPDATE accounts SET contacts=jsonb_set(contacts,'{current}',$1::jsonb,true),contact_revision=contact_revision+1 WHERE id=$2 AND role='society' AND (enabled OR $4) AND contact_revision=$3 RETURNING id,contacts,contact_revision",
    [JSON.stringify(b.profile), id, b.revision, actor.role === "admin"],
  );
  if (!a)
    throw new AppError("These contacts changed. Reload before saving.", 409);
  await audit(db, actor.id, "SOCIETY_CONTACTS_UPDATED", id);
  return a;
}
