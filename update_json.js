const fs = require('fs');
const path = require('path');
const dir = 'd:/workspaces/workflow/backend/modules/common/src/main/resources/connectors';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (data.authType === 'OAUTH2') {
        data.connectionSetup = {
            buttonLabel: 'Sign in with ' + data.displayName,
            description: 'Connect your ' + data.displayName + ' account to allow workflows to access it securely.'
        };
        data.verifyAction = {
            method: 'GET',
            path: data.actions.find(a => a.actionId === 'get_profile' || a.actionId === 'list_channels' || a.actionId === 'get_user' || a.method === 'GET')?.path || '/'
        };
    } else if (data.authType === 'BEARER_TOKEN' || data.authType === 'API_KEY') {
        let label = 'API Key';
        if (data.displayName === 'GitHub' || data.displayName === 'Airtable') label = 'Personal Access Token';
        if (data.displayName === 'Stripe') label = 'Secret Key';
        
        let hint = data.credentialGuide?.fields?.[0]?.hint || '';
        
        data.connectionSetup = {
            fields: [
                {
                    key: 'token',
                    label: label,
                    hint: hint,
                    sensitive: true
                }
            ]
        };
        // Simple verify for bearer
        data.verifyAction = {
            method: 'GET',
            path: data.actions.find(a => a.method === 'GET')?.path || '/'
        };
    } else if (data.authType === 'BASIC_AUTH') {
        data.connectionSetup = {
            fields: [
                {
                    key: 'username',
                    label: data.credentialGuide?.fields?.[0]?.label || 'Username',
                    hint: data.credentialGuide?.fields?.[0]?.hint || '',
                    sensitive: false
                },
                {
                    key: 'password',
                    label: data.credentialGuide?.fields?.[1]?.label || 'Password',
                    hint: data.credentialGuide?.fields?.[1]?.hint || '',
                    sensitive: true
                }
            ]
        };
        data.verifyAction = {
            method: 'GET',
            path: data.actions.find(a => a.method === 'GET')?.path || '/'
        };
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('Updated ' + file);
});
