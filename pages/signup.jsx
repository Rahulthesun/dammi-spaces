import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, UserCheck, Shield, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const [step, setStep] = useState('signup'); // 'signup', 'confirmation', 'profile'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'user'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const [sessionData, setSessionData] = useState(null);

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

  const handleSignup = async () => {
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
          role: formData.role
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserData(data.user);
        setSessionData(data.session);
        
        if (!data.session) {
          // Email confirmation required
          setMessage(data.message);
          setStep('confirmation');
        } else {
          // Direct signup success, move to profile creation
          setMessage('Account created successfully!');
          setStep('profile');
        }
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!userData) {
      setError('User data not found. Please try signing up again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userData.id,
          full_name: formData.full_name,
          role: formData.role,
          access_token: sessionData?.access_token || 'demo_token'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Profile created successfully! Welcome aboard!');
        
        // Simulate redirect to dashboard
        setTimeout(() => {
          alert('Account setup complete! In production, you would be redirected to dashboard.');
        }, 1500);
      } else {
        setError(data.error || 'Failed to create profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    setLoading(true);
    try {
      // In a real app, you'd have an API endpoint to resend confirmation
      // For now, we'll simulate it
      setTimeout(() => {
        setMessage('Confirmation email sent again! Please check your inbox.');
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to resend confirmation email');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'signup' && <User className="w-8 h-8 text-emerald-600" />}
            {step === 'confirmation' && <Mail className="w-8 h-8 text-emerald-600" />}
            {step === 'profile' && <UserCheck className="w-8 h-8 text-emerald-600" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'signup' && 'Create Account'}
            {step === 'confirmation' && 'Check Your Email'}
            {step === 'profile' && 'Complete Your Profile'}
          </h1>
          <p className="text-gray-600 mt-2">
            {step === 'signup' && 'Join us today and get started'}
            {step === 'confirmation' && 'We sent you a confirmation link'}
            {step === 'profile' && 'Set up your profile information'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${step === 'signup' ? 'bg-emerald-600' : 'bg-emerald-200'}`} />
            <div className={`w-8 h-1 ${step !== 'signup' ? 'bg-emerald-200' : 'bg-gray-200'}`} />
            <div className={`w-3 h-3 rounded-full ${step === 'confirmation' ? 'bg-emerald-600' : step === 'profile' ? 'bg-emerald-200' : 'bg-gray-200'}`} />
            <div className={`w-8 h-1 ${step === 'profile' ? 'bg-emerald-200' : 'bg-gray-200'}`} />
            <div className={`w-3 h-3 rounded-full ${step === 'profile' ? 'bg-emerald-600' : 'bg-gray-200'}`} />
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

        {/* Signup Step */}
        {step === 'signup' && (
          <div className="space-y-6">
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        )}

        {/* Email Confirmation Step */}
        {step === 'confirmation' && (
          <div className="text-center space-y-6">
            <div className="bg-emerald-50 p-6 rounded-lg">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <p className="text-gray-700 mb-4">
                We've sent a confirmation email to:
              </p>
              <p className="font-semibold text-gray-900 mb-4">{formData.email}</p>
              <p className="text-sm text-gray-600">
                Please click the link in the email to verify your account and complete the signup process.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={resendConfirmation}
                disabled={loading}
                className="w-full bg-emerald-100 text-emerald-700 py-3 px-4 rounded-lg font-medium hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Resend Confirmation Email'}
              </button>
              
              <button
                onClick={() => setStep('profile')}
                className="w-full text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
              >
                Skip for now (Demo)
              </button>
            </div>
          </div>
        )}

        {/* Profile Creation Step */}
        {step === 'profile' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                Let's create your profile to complete the setup
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Account Details</h3>
              <p className="text-sm text-gray-600">Email: {formData.email}</p>
              <p className="text-sm text-gray-600">Name: {formData.full_name}</p>
              <p className="text-sm text-gray-600">Role: {formData.role}</p>
            </div>

            <button
              onClick={handleCreateProfile}
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Profile...' : 'Complete Setup'}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => window.location.href = '/login'}
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