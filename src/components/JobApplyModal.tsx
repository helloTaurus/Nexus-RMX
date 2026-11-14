import React, { useState, useRef } from 'react';
import { JobOpening } from '../data/careersData';
import {
  X,
  CheckCircle,
  PaperPlaneTilt,
  UploadSimple,
  FileText,
  Trash,
  Copy,
  Check,
  ShieldCheck,
  WarningCircle,
  SpinnerGap
} from '@phosphor-icons/react';

export interface JobApplyModalProps {
  job?: JobOpening | null;
  isGeneralCv?: boolean;
  onClose: () => void;
}

const AREAS_OF_INTEREST = [
  'Credit Risk & Underwriting',
  'Operations & Branch Management',
  'Fintech & Software Engineering',
  'Institutional Sales & Partnerships',
  'Finance, Treasury & Accounting',
  'Compliance, Legal & AML',
  'Customer Success & Loan Servicing',
  'Executive Administration & Human Capital',
  'Other / General Banking'
];

export const JobApplyModal: React.FC<JobApplyModalProps> = ({ job, isGeneralCv = false, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [areaOfInterest, setAreaOfInterest] = useState(AREAS_OF_INTEREST[0]);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [talentPoolConsent, setTalentPoolConsent] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);

  // Client idempotency key generated once per session to protect against network retries / double-clicks
  const [idempotencyKey] = useState(() => {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Don't render if neither job nor general CV mode is active
  if (!job && !isGeneralCv) return null;

  const isGeneral = isGeneralCv || !job;
  const modalTitle = isGeneral ? 'General CV / Speculative Submission' : job.title;
  const modalSubtitle = isGeneral
    ? 'Executive Talent Pool & Future Opportunities'
    : `${job.department} · ${job.location}`;

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxBytes = 5 * 1024 * 1024; // 5 MB

    if (file.size > maxBytes) {
      setFormError(`CV file size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB limit.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setFormError('Only genuine PDF (.pdf) or Word documents (.docx) are permitted.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCvFile(file);
  };

  const handleRemoveFile = () => {
    setCvFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!fullName.trim()) {
      setFormError('Please enter your full legal name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Please provide a valid email address.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setFormError('Please enter a valid phone number (Nigerian or international format).');
      return;
    }
    if (!cvFile) {
      setFormError('Please upload your CV document in PDF or DOCX format.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('email', email.trim());
      formData.append('phone', phone.trim());
      formData.append('submissionType', isGeneral ? 'general' : 'vacancy');
      if (isGeneral) {
        formData.append('areaOfInterest', areaOfInterest);
      } else if (job) {
        formData.append('vacancyId', job.id);
      }
      formData.append('coverNote', coverNote.trim());
      formData.append('portfolioUrl', portfolioUrl.trim());
      formData.append('talentPoolConsent', talentPoolConsent ? 'true' : 'false');
      formData.append('idempotencyKey', idempotencyKey);
      formData.append('cv', cvFile);

      const response = await fetch('/api/recruitment/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Submission failed. Please check your information and try again.');
      }

      setSubmittedRef(data.referenceNumber);
    } catch (err: any) {
      console.error('Recruitment application error:', err);
      setFormError(err.message || 'Network error occurred while transmitting application. Your entered information has been preserved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReference = () => {
    if (submittedRef) {
      navigator.clipboard.writeText(submittedRef);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl my-auto max-h-[92vh] overflow-y-auto bg-neutral-950 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-left font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-6">
          <div className="pr-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00e575] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {isGeneral ? 'Talent Desk Intake' : 'Official Application'}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-1.5">
              {modalTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{modalSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUCCESS CONFIRMATION VIEW */}
        {submittedRef ? (
          <div className="text-center py-6 sm:py-8 space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-[#00e575] flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <CheckCircle className="w-9 h-9" weight="fill" />
            </div>

            <div className="space-y-1">
              <h4 className="text-2xl font-black text-white font-display">
                Application Transmitted
              </h4>
              <p className="text-xs text-slate-400">
                Your dossier has been securely logged into the Nexus Recruitment Registry.
              </p>
            </div>

            {/* Official Reference Number Box */}
            <div className="p-5 rounded-2xl bg-white/[0.04] border border-[#00e575]/30 max-w-md mx-auto text-center space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Official Tracking Reference
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-[#00e575] font-mono tracking-tight">
                  {submittedRef}
                </span>
                <button
                  onClick={handleCopyReference}
                  title="Copy reference number"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedRef ? <Check className="w-4 h-4 text-[#00e575]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Quote this reference in any communication with our Human Capital desk.
              </p>
            </div>

            <div className="max-w-md mx-auto text-left p-4 rounded-xl bg-neutral-900 border border-white/10 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#00e575]" />
                <span>Next Review Steps</span>
              </div>
              <p className="text-[12px] leading-relaxed text-slate-400">
                A confirmation email has been dispatched to <strong className="text-white">{email}</strong>. Our hiring committee will review your qualifications and contact you within <strong>5 to 7 business days</strong>.
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#00e575]/20"
              >
                Close &amp; Finish
              </button>
            </div>
          </div>
        ) : (
          /* PUBLIC APPLICATION FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2.5">
                <WarningCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" weight="bold" />
                <span className="leading-relaxed">{formError}</span>
              </div>
            )}

            {/* General CV Area of Interest selection */}
            {isGeneral && (
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Primary Area of Interest *
                </label>
                <select
                  value={areaOfInterest}
                  onChange={(e) => setAreaOfInterest(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs focus:outline-none focus:border-[#00e575] cursor-pointer"
                >
                  {AREAS_OF_INTEREST.map((area) => (
                    <option key={area} value={area} className="bg-neutral-950 text-white">
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chinelo Okonkwo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-[#00e575]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-[#00e575]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Phone Number (Nigerian / International) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0803 000 0000 or +234..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-[#00e575]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  LinkedIn / Portfolio URL <span className="text-slate-500 lowercase">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-[#00e575]"
                />
              </div>
            </div>

            {/* CV FILE UPLOAD (PDF & DOCX ONLY, 5MB MAX) */}
            <div>
              <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                Curriculum Vitae (CV) * <span className="text-slate-500 normal-case">(PDF or DOCX, max 5 MB)</span>
              </label>

              {!cvFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 hover:border-[#00e575]/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white/[0.02] hover:bg-white/[0.04]"
                >
                  <UploadSimple className="w-7 h-7 text-[#00e575] mx-auto mb-2" />
                  <p className="text-xs text-white font-medium">
                    Click to select or drag and drop your CV file
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Accepted formats: Genuine PDF (.pdf) or Microsoft Word (.docx) &middot; Up to 5 MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.04] border border-white/15">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-[#00e575] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" weight="bold" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">{cvFile.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {(cvFile.size / 1024).toFixed(1)} KB &middot; Verified ready for secure upload
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    title="Remove file"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Optional Cover Note */}
            <div>
              <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                Cover Note / Core Achievements <span className="text-slate-500 lowercase">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Briefly state your core banking achievements, credit underwriting experience, or fintech background..."
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-[#00e575] resize-none"
              />
            </div>

            {/* TALENT POOL OPTIONAL CONSENT (UNTICKED BY DEFAULT) */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={talentPoolConsent}
                  onChange={(e) => setTalentPoolConsent(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-neutral-900 text-[#00e575] focus:ring-[#00e575] focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  <strong>Nexus Talent Pool Consideration (Optional):</strong> Retain my CV and credentials for up to 2 years in the Nexus Talent Pool to consider me for future matching opportunities.
                </span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                Applying for this role does not require talent pool consent. You may request data removal at any time pursuant to the Nigeria Data Protection Act (NDPA).
              </p>
            </div>

            {/* Privacy Reassurance */}
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#00e575] shrink-0" />
              <span>
                Your data is transmitted securely and stored in private zero-trust storage. We do not require BVN, NIN, or banking details at this stage.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap className="w-4 h-4 animate-spin" weight="bold" />
                    <span>Processing Submission...</span>
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt className="w-4 h-4" weight="bold" />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
