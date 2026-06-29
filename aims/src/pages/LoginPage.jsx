import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { languages } from '../data/dummyData';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const [role, setRole] = useState('manager');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'ko');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  const handleLogin = (e) => {
    e.preventDefault();

    if (role === 'manager') {
      navigate('/manager/dashboard');
    } else {
      navigate('/worker/home');
    }
  };

  return (
    <div className="min-h-screen bg-primary flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/3 flex-col justify-center items-center p-8 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-32 left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-xl text-center text-white">
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-3xl blur-2xl opacity-50" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 rounded-3xl flex items-center justify-center shadow-2xl">
                <Cpu size={40} className="text-white" />
              </div>
            </div>
          </div>

          {/* Main Text */}
          <h2 className="text-6xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
            AIMS
          </h2>
          <p className="text-lg text-blue-100 leading-relaxed font-light">
            AI를 사용한 스마트 제조 작업 절차 시스템
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 lg:w-2/3 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border hover:bg-card-hover transition-colors"
        >
          <span className="text-lg">{dark ? '☀️' : '🌙'}</span>
          <span className="text-xs font-medium text-text-secondary">{dark ? 'Light' : 'Dark'}</span>
        </button>

        {/* Mobile Logo */}
        <div className="lg:hidden mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-3xl flex items-center justify-center mx-auto shadow-xl mb-4">
            <Cpu size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-center text-text-primary">AIMS</h2>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-text-primary mb-3">
              로그인
            </h1>
            <p className="text-base text-text-secondary">
              계정에 로그인하여 시작하세요
            </p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-xl space-y-8">
            {/* Role Toggle */}
            <div className="grid grid-cols-2 gap-3 bg-primary rounded-xl p-1">
              {[
                { value: 'manager', label: '관리자' },
                { value: 'worker', label: '근로자' }
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => { setRole(item.value); setError(''); }}
                  className={`py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    role === item.value
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2.5">
                  이메일 주소
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3 bg-primary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2.5">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-3 bg-primary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Language Selector - Worker Only */}
              {role === 'worker' && (
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2.5">
                    {t('auth.language')}
                  </label>
                  <select
                    value={language}
                    onChange={(e) => {
                      const lang = e.target.value;
                      setLanguage(lang);
                      i18n.changeLanguage(lang);
                      localStorage.setItem('language', lang);
                    }}
                    className="w-full px-5 py-3 bg-primary border border-border rounded-lg text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-base mt-8"
              >
                로그인하기
              </button>
            </form>

          </div>

          {/* Footer */}
          <p className="text-center text-xs text-text-muted mt-10">
            © 2025 AIMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
