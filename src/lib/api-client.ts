/*
 * Copyright 2026 Amerigo Di Maria
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
