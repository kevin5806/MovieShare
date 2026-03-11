import { randomUUID } from "node:crypto";

export type TestIdentity = {
  name: string;
  email: string;
  password: string;
};

function makeToken() {
  return randomUUID().slice(0, 8);
}

export function createTestIdentity(prefix: string): TestIdentity {
  const token = makeToken();

  return {
    name: `PW ${prefix} ${token}`,
    email: `pw-${prefix}-${token}@movieshare.test`,
    password: `Passw0rd!${token}`,
  };
}

export function createListName(prefix: string) {
  return `PW ${prefix} ${makeToken()}`;
}
