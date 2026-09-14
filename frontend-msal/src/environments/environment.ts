export const environment = {
  production: false,

   azure: {
    clientId: 'd7f096c4-0ef5-4833-8def-e802ffd7314a',
    tenantId: 'f402d005-2163-4d89-a6cd-e07c25b973b2',
    authority: 'https://login.microsoftonline.com/f402d005-2163-4d89-a6cd-e07c25b973b2',
    redirectUri: 'http://localhost:4200/',

    backendScope: 'api://54bc913a-2f45-4e55-9eae-b30616a9f8d5/OT.Create',
  },

  apiUrl: 'https://a0ugnd6zvi.execute-api.us-east-1.amazonaws.com'
};