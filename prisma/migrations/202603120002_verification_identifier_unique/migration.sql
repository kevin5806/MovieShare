WITH ranked_verifications AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "identifier"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "Verification"
)
DELETE FROM "Verification"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_verifications
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "Verification_identifier_key" ON "Verification"("identifier");
