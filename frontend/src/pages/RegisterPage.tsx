import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CiteVerifyLogo, ChevronLeftIcon, InfoIcon } from '../components/common/Icons';
import { useToast } from '../components/common/Toast';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState<'lead_investigator' | 'peer_reviewer' | 'auditor'>('peer_reviewer');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'info',
      title: 'Registration Is Not Available',
      message: 'The backend has no account registration endpoint. No profile or session was created.',
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-sage-bg text-forest-text flex flex-col justify-between p-6">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <CiteVerifyLogo size="md" />
        </Link>
        <Link
          to="/"
          className="text-xs text-forest-text-secondary hover:text-forest-text flex items-center gap-1.5 font-bold"
        >
          <ChevronLeftIcon size={12} />
          Back to Home
        </Link>
      </header>

      <main className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-3xl border border-sage-border p-8 sm:p-9 shadow-card space-y-6">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-forest-text-secondary block mb-1 font-bold">
              METASCIENCE AUDITOR REGISTRATION
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">
              Create Auditor Profile
            </h1>
            <p className="text-xs sm:text-sm text-forest-text-secondary mt-1">
              Account registration is not implemented by the connected backend.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-sage-border bg-sage-subtle text-xs text-forest-text-secondary space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-forest-text">
              <InfoIcon size={14} className="text-forest-text" />
              <span>Open Researcher Evaluation Notice</span>
            </div>
            <p className="text-[11px]">
              The backend has no registration endpoint. Values entered here are not sent to a server and do not create an account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-forest-text block">
                Full Name & Title
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-sage-border bg-white text-forest-text focus:outline-none focus:border-forest-text text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-forest-text block">
                Institutional Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-sage-border bg-white text-forest-text focus:outline-none focus:border-forest-text font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-forest-text block">
                Research Institution / Laboratory
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-sage-border bg-white text-forest-text focus:outline-none focus:border-forest-text text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-forest-text block">
                Primary Auditor Role
              </label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sage-border bg-white text-forest-text focus:outline-none focus:border-forest-text text-xs font-semibold"
              >
                <option value="lead_investigator">Lead Investigator</option>
                <option value="peer_reviewer">Peer Reviewer</option>
                <option value="auditor">Metascience Auditor</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full btn-lime-gradient text-forest-text font-bold shadow-sm transition-all text-xs tracking-wide"
            >
              Complete Registration & Enter
            </button>
          </form>

          <div className="text-center text-xs text-forest-text-secondary">
            Already have an active session?{' '}
            <Link to="/signin" className="text-forest-text hover:underline font-bold">
              Sign in directly
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-forest-text-muted font-mono">
        CiteVerify · Developed by Alpha Dev · Research Platform
      </footer>
    </div>
  );
};
