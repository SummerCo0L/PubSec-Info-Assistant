// new changes by MY //

import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
    auth: {
        clientId: "c3c9de9c-c343-4283-adcd-77ff1afaa324",
        authority: "https://login.microsoftonline.com/a2c8f93f-126b-4596-a360-8941a8984b08",
        redirectUri: "https://infoasst-web-wfncg.azurewebsites.net/.auth/login/aad/callback"
    }
};

const msalInstance = new PublicClientApplication(msalConfig);

export const getAccessToken = async () => {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
        const response = await msalInstance.acquireTokenSilent({
            scopes: ["User.Read", "AppRoleAssignment.Read"],
            account: accounts[0]
        });
        return response.accessToken;
    } else {
        throw new Error("No accounts found");
    }
};

// new changes by MY //