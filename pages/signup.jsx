import { useState } from 'react';
import { useRouter } from 'next/router';
import { Eye, EyeOff, Mail, Lock, User, Shield, CheckCircle, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState('create_account'); // 'create_account' or 'verify_token'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'user',
    token: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      setError('Please fill in all required fields');
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          step: 'create_account'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setStep('verify_token');
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          token: formData.token,
          step: 'verify_token'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store session data if provided
        if (data.session) {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('session', JSON.stringify(data.session));
        }
        
        // Redirect to login or dashboard
        router.push('/dashboard');
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBackToSignup = () => {
    setStep('create_account');
    setMessage('');
    setError('');
    setFormData({ ...formData, token: '' });
  };

  const resendToken = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          step: 'create_account'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('New verification code sent to your email!');
      } else {
        setError(data.error || 'Failed to resend verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'create_account' ? (
              <User className="w-8 h-8 text-emerald-600" />
            ) : (
              <Mail className="w-8 h-8 text-emerald-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'create_account' ? 'Create Account' : 'Verify Your Email'}
          </h1>
          <p className="text-gray-600 mt-2">
            {step === 'create_account' 
              ? 'Join us today and get started' 
              : 'Enter the verification code from your email'
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${step === 'create_account' ? 'bg-emerald-600' : 'bg-emerald-200'}`} />
            <div className={`w-8 h-1 ${step === 'verify_token' ? 'bg-emerald-200' : 'bg-gray-200'}`} />
            <div className={`w-3 h-3 rounded-full ${step === 'verify_token' ? 'bg-emerald-600' : 'bg-gray-200'}`} />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {message}
          </div>
        )}

        {/* Create Account Step */}
        {step === 'create_account' && (
          <form onSubmit={handleCreateAccount} className="space-y-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-black"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-black"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-black"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-black"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-black"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Verify Token Step */}
        {step === 'verify_token' && (
          <form onSubmit={handleVerifyToken} className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-emerald-50 p-6 rounded-lg">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <p className="text-gray-700 mb-2">
                  Verification code sent to:
                </p>
                <p className="font-semibold text-gray-900 mb-4">{formData.email}</p>
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your email below
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="token"
                name="token"
                required
                value={formData.token}
                onChange={handleInputChange}
                maxLength="6"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-center text-lg font-mono tracking-wider text-black"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={goBackToSignup}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </button>
              
              <button
                type="button"
                onClick={resendToken}
                disabled={loading}
                className="text-sm text-emerald-600 hover:text-emerald-800 disabled:opacity-50 transition-colors"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}