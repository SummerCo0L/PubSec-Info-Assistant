// new changes by MY //

import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
    auth: {
        clientId: "<clientId>", // insert your clientId here
        authority: "https://login.microsoftonline.com/<insert your tenant id here>", // insert your tenantid here
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
