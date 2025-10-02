import React from 'react';
import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh'
    }}>
      <SignIn
        afterSignInUrl="/"
        redirectUrl="/"
      />
    </div>
  );
}


