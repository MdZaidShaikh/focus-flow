'use client';

import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// Configure Amplify
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '';
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID || '';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
    }
  }
});

export default function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return (
    <Authenticator>
      {children}
    </Authenticator>
  );
}
