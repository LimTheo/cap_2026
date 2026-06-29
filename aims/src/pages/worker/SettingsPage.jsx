import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { languages } from '../../data/dummyData';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(i18n.language);
  const navigate = useNavigate();

  const handleLangSelect = (code) => {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Language Selection */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4">
          {t('worker.settings.languageTitle')}
        </h2>
        <div className="space-y-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLangSelect(lang.code)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors text-left ${
                selectedLang === lang.code
                  ? 'bg-accent/10 border-accent'
                  : 'bg-card border-border hover:bg-card-hover'
              }`}
            >
              <span className="text-3xl">{lang.flag}</span>
              <span className="flex-1 text-base font-medium text-text-primary">
                {lang.name}
              </span>
              {selectedLang === lang.code && (
                <Check size={20} className="text-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4">
          {t('worker.settings.profileTitle')}
        </h2>
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xl font-bold">
              N
            </div>
            <div>
              <p className="text-base font-bold text-text-primary">Nguyen Van A</p>
              <p className="text-sm text-text-muted">RC카 전면부 조립</p>
            </div>
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{t('worker.settings.employeeId')}</span>
              <span className="text-text-primary">W-001</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{t('worker.settings.department')}</span>
              <span className="text-text-primary">조립 1팀</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => navigate('/')}
        className="w-full py-3.5 bg-danger/10 border border-danger/30 text-danger rounded-xl font-medium text-base flex items-center justify-center gap-2 hover:bg-danger/20 transition-colors"
      >
        <LogOut size={20} />
        {t('worker.settings.logout')}
      </button>
    </div>
  );
}
