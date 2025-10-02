import React from 'react';
import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh'
    }}>
      <SignUp
        afterSignUpUrl="/"
        redirectUrl="/"
      />
    </div>
  );
}


