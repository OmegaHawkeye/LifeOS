import { SecureCredentialStore } from "./secureCredentialStore";
import { MobileAuthService } from "./mobileAuthService";

export const mobileAuthService = new MobileAuthService({
  credentialStore: new SecureCredentialStore(),
});
