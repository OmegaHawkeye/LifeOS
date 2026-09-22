import type { MobileAuthService } from "./mobileAuthService";

type Envelope<T> = { data: T };

export class MobileTwoFactorService {
  private readonly api: Pick<MobileAuthService, "request">;

  constructor(api: Pick<MobileAuthService, "request">) {
    this.api = api;
  }

  async getStatus(): Promise<boolean> {
    const response = await this.api.request<Envelope<{ enabled: boolean }>>(
      "/security/two-factor",
    );
    return response.data.enabled;
  }

  async beginSetup(currentPassword: string): Promise<string> {
    const response = await this.api.request<Envelope<{ secret: string }>>(
      "/security/two-factor/setup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword }),
      },
    );
    return response.data.secret;
  }

  async confirm(code: string): Promise<void> {
    await this.api.request("/security/two-factor/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
  }

  async disable(currentPassword: string, code: string): Promise<void> {
    await this.api.request("/security/two-factor", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, code }),
    });
  }
}
