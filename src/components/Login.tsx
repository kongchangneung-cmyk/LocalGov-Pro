import React from 'react';
import { useAuth } from '../useAuth';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
  const { login, loading, user } = useAuth();

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-neutral-200">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-4">
            <LogIn className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Local Gov Construction</h1>
          <p className="text-neutral-500 mt-2">Sign in to access the dashboard</p>
        </div>

        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>

        <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">
            Secure Access Control
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
