import { msalInstance, loginRequest } from "./msal-config";

const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || "/api";

async function getAccessToken() {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;

    try {
        const response = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
        });
        return response.accessToken;
    } catch (error) {
        console.log("Silent token acquisition failed, acquiring token using popup", error);
        const response = await msalInstance.acquireTokenPopup(loginRequest);
        return response.accessToken;
    }
}

export const apiClient = {
    async get(entity: string, id?: string) {
        const token = await getAccessToken();
        const url = new URL(`${API_BASE_URL}/data-service`, window.location.origin);
        url.searchParams.append("entity", entity);
        if (id) url.searchParams.append("id", id);

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
    },

    async post(entity: string, body: any) {
        const token = await getAccessToken();
        const url = new URL(`${API_BASE_URL}/data-service`, window.location.origin);
        url.searchParams.append("entity", entity);

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
    },
};
