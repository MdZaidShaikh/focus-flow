'use client';

import { Amplify } from 'aws-amplify';
import { resetPassword } from 'aws-amplify/auth';
import { Authenticator, ThemeProvider, Theme, useAuthenticator } from '@aws-amplify/ui-react';
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

const theme: Theme = {
  name: 'focusflow-theme',
  tokens: {
    colors: {
      background: {
        primary: { value: '#1D212B' }, // surface
        secondary: { value: '#14171F' }, // bg
      },
      font: {
        interactive: { value: '#EDEAE0' },
        primary: { value: '#EDEAE0' },
        secondary: { value: '#8A8F9C' },
      },
      brand: {
        primary: {
          10: { value: '#fcefc7' },
          80: { value: '#E8A33D' }, // work color
          90: { value: '#c9882a' },
          100: { value: '#aa711d' },
        },
      },
      border: {
        primary: { value: '#2C3140' }, // border color
        secondary: { value: '#2C3140' },
        focus: { value: '#E8A33D' },
      },
    },
    components: {
      authenticator: {
        router: {
          boxShadow: { value: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' },
          borderWidth: { value: '1px' },
          borderColor: { value: '#2C3140' },
          backgroundColor: { value: '#1D212B' },
        },
      },
      tabs: {
        item: {
          color: { value: '#8A8F9C' },
          _active: {
            color: { value: '#EDEAE0' },
            borderColor: { value: '#E8A33D' },
            backgroundColor: { value: 'transparent' },
          },
          _hover: {
            color: { value: '#EDEAE0' },
          },
        },
      },
      fieldcontrol: {
        borderColor: { value: '#2C3140' },
        color: { value: '#EDEAE0' },
      },
      button: {
        primary: {
          backgroundColor: { value: '#E8A33D' },
          color: { value: '#14171F' },
          _hover: {
            backgroundColor: { value: '#c9882a' },
          }
        },
        link: {
          color: { value: '#E8A33D' },
          _hover: {
            backgroundColor: { value: 'transparent' },
            color: { value: '#c9882a' },
          }
        }
      }
    },
  },
};

const components = {
  Header() {
    return (
      <div className="text-center pt-24 pb-8">
        <p className="font-mono text-2xl font-bold tracking-widest text-work uppercase mb-2">
          FocusFlow
        </p>
        <h1 className="font-display text-3xl text-ink">
          Say the day out loud.
        </h1>
      </div>
    );
  },
  SignIn: {
    Footer() {
      const { toForgotPassword } = useAuthenticator();

      return (
        <div className="text-center pb-6 border-t border-border mt-4 pt-4">
          <p className="text-sm text-muted mb-2">Want to try it out?</p>
          <div className="bg-surface inline-block px-4 py-2 rounded-md border border-border">
            <p className="text-sm font-mono text-ink">Email: <span className="font-bold">demo@focusflow.app</span></p>
            <p className="text-sm font-mono text-ink">Password: <span className="font-bold">DemoPassword123!</span></p>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={toForgotPassword}
              className="text-sm text-work hover:underline hover:text-[#c9882a] transition-colors bg-transparent border-none cursor-pointer"
            >
              Forgot your password?
            </button>
          </div>
        </div>
      );
    },
  },
};

const formFields = {
  signUp: {
    email: {
      order: 1,
      isRequired: true,
    },
    password: {
      order: 2,
    },
    confirm_password: {
      order: 3,
    },
  },
};

const services = {
  async handleForgotPassword(formData: Record<string, any>) {
    if (formData.username === 'demo@focusflow.app') {
      throw new Error('Resetting the demo account password is not allowed.');
    }
    return resetPassword({ username: formData.username });
  },
};

export default function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <Authenticator.Provider>
        <Authenticator
          components={components}
          services={services}
          formFields={formFields}
          loginMechanisms={['email']}
          hideSignUp={false}
        >
          {({ signOut, user }) => (
            <main>
              {children}
            </main>
          )}
        </Authenticator>
      </Authenticator.Provider>
    </ThemeProvider>
  );
}
