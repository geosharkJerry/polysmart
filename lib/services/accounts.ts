import crypto from "node:crypto";
import { runtimeState, nextId } from "@/lib/store";
import { AccountCredential, AccountPlatform, MatrixAccount } from "@/lib/types";

const keyMaterial = crypto.createHash("sha256").update("polysmart-dev-key").digest();

function encryptPayload(payload: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial, iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedPayload: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

function decryptPayload(cred: AccountCredential) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyMaterial,
    Buffer.from(cred.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(cred.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cred.encryptedPayload, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

function platformHealth(platform: AccountPlatform) {
  if (platform === "predictit") {
    return "degraded" as const;
  }
  return "healthy" as const;
}

export function listAccounts() {
  return runtimeState.accounts;
}

export function bindAccount(input: {
  userId: string;
  platform: AccountPlatform;
  label: string;
  proxyUrl: string;
  credentials: Record<string, string>;
}) {
  const accountId = nextId("ACC");
  const account: MatrixAccount = {
    accountId,
    userId: input.userId,
    platform: input.platform,
    label: input.label,
    proxyUrl: input.proxyUrl,
    status: platformHealth(input.platform),
    lastHealthCheckAt: new Date().toISOString()
  };

  const secret = encryptPayload(JSON.stringify(input.credentials));
  runtimeState.accountCredentials[accountId] = {
    accountId,
    platform: input.platform,
    keyVersion: "v1",
    createdAt: new Date().toISOString(),
    ...secret
  };

  runtimeState.accounts.push(account);

  return {
    account,
    health: account.status
  };
}

export function inspectCredential(accountId: string) {
  const cred = runtimeState.accountCredentials[accountId];
  if (!cred) {
    return null;
  }

  return {
    accountId,
    platform: cred.platform,
    payload: JSON.parse(decryptPayload(cred)) as Record<string, string>
  };
}
