import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoginForm from '../Components/LoginSignup/LoginForm';
import SignupForm from '../Components/LoginSignup/SignupForm';

const LoginSignup = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.state?.defaultTab !== 'signup');

  return (
    <div className="loginsignup">
      <div className="loginsignup-container">
        <h1>{isLogin ? 'Login' : 'Sign Up'}</h1>
        {isLogin ? <LoginForm /> : <SignupForm />}
        <p className="loginsignup-switch">
          {isLogin
            ? "Don't have an account? "
            : 'Already have an account? '}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginSignup;
