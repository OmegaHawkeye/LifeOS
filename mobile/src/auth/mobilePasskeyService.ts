export type MobilePasskey = {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string | null;
};

export type MobilePasskeySettings = {
  passkeys_enabled: boolean;
  passkey_origin: string;
  passkey_origin_is_secure: boolean;
};

type MobilePasskeyApi = {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
};

type DataEnvelope<T> = { data: T };

export class MobilePasskeyService {
  constructor(private readonly api: MobilePasskeyApi) {}

  async list(): Promise<MobilePasskey[]> {
    const response =
      await this.api.request<DataEnvelope<MobilePasskey[]>>(
        "/security/passkeys",
      );
    return response.data;
  }

  async beginManagement(): Promise<string> {
    const response = await this.api.request<
      DataEnvelope<{ management_url: string }>
    >("/security/passkeys/management-sessions", { method: "POST" });
    return response.data.management_url;
  }

  async remove(id: string): Promise<void> {
    await this.api.request<void>(
      `/security/passkeys/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  }

  async getSettings(): Promise<MobilePasskeySettings> {
    const response = await this.api.request<DataEnvelope<MobilePasskeySettings>>(
      "/settings",
    );
    return response.data;
  }

  async updateSettings(passkeysEnabled: boolean): Promise<MobilePasskeySettings> {
    const response = await this.api.request<DataEnvelope<MobilePasskeySettings>>(
      "/settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkeys_enabled: passkeysEnabled }),
      },
    );
    return response.data;
  }
}
