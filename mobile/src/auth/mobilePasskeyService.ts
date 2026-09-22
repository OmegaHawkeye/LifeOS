export type MobilePasskey = {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string | null;
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
}
