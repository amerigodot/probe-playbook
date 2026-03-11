import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const tenantId = process.env.AZURE_TENANT_ID || 'common';
const clientId = process.env.VITE_AZURE_CLIENT_ID;
const discoveryUrl = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;

const client = jwksClient({
  jwksUri: jwksUri,
  cache: true,
  rateLimit: true,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key: any) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

export async function validateToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      audience: clientId,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      algorithms: ['RS256'],
    }, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded);
    });
  });
}

export function getWorkspaceIdFromToken(decodedToken: any): string {
  // In a real enterprise app, we might map tid (tenant id) or a custom claim to workspace_id
  // For the hackathon, we assume the 'oid' (object id) or a specific claim maps to a workspace
  return decodedToken.oid || '00000000-0000-0000-0000-000000000000';
}
