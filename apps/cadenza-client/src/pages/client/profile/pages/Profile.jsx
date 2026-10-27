import { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Pencil,
  Save,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

import {
  getMyProfile,
  updateMyPassword,
  updateMyProfile,
} from '../services/profile.service';

const emptyForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  phone: '',
  address: '',
  age: '',
  gender: '',
  guardianName: '',
  contactNo: '',
};

const getAddressText = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return (
    address.line1 ||
    address.fullAddress ||
    Object.values(address).filter(Boolean).join(', ')
  );
};

export default function Profile({ showGuardian = true, staffProfile = false }) {
  const [form, setForm] = useState(emptyForm);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileConfirmOpen, setProfileConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hasActiveEnrollment, setHasActiveEnrollment] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);

  useEffect(() => {
    const loadProfile = () => getMyProfile()
      .then((profile) => {
        const person = profile?.person || {};
        setEmail(profile?.user?.email || person.email || '');
        setHasActiveEnrollment(Boolean(profile?.hasActiveEnrollment));
        const studentDetails = person.metadata?.studentDetails || {};
        setForm({
          firstName: person.firstName || '',
          middleName: person.middleName || '',
          lastName: person.lastName || '',
          suffix: person.suffix || '',
          phone: person.phone || '',
          contactNo: person.phone || '',
          address: getAddressText(person.address),
          age: studentDetails.age ?? '',
          gender: studentDetails.gender || '',
          guardianName: studentDetails.guardianName || '',
        });
      })
      .catch(() => toast.error('Unable to load your profile.'))
      .finally(() => setLoading(false));
    loadProfile();
    const refreshTimer = window.setInterval(loadProfile, 15000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      (!staffProfile && (!form.contactNo.trim() || !form.address.trim() || !form.age || !form.gender || (showGuardian && !form.guardianName.trim())))
    ) {
      toast.error(showGuardian ? 'First name, last name, contact number, age, gender, address and guardian are required.' : 'First name, last name, contact number, age, gender and address are required.');
      return;
    }

    const phonePattern = staffProfile ? /^09\d{9}$/ : /^(09\d{9}|\+639\d{9})$/;
    if (form.contactNo.trim() && !phonePattern.test(form.contactNo.trim())) {
      toast.error(staffProfile
        ? 'Enter an 11-digit Philippine mobile number starting with 09.'
        : 'Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).');
      return;
    }

    if (staffProfile && (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
      toast.error('Enter a valid email address.');
      return;
    }

    setProfileConfirmOpen(true);
  };

  const confirmProfileUpdate = async () => {
    try {
      setSaving(true);
      setProfileConfirmOpen(false);
      const updated = await updateMyProfile({
        firstName: form.firstName,
        middleName: form.middleName.trim() || null,
        lastName: form.lastName,
        suffix: form.suffix,
        phone: form.contactNo.trim() || null,
        address: form.address.trim() ? { line1: form.address.trim() } : null,
        age: form.age === '' ? null : Number(form.age),
        gender: form.gender || null,
        guardianName: form.guardianName.trim() || null,
        ...(staffProfile ? { email: email.trim() } : {}),
      });
      const person = updated?.person || {};
      setForm((current) => ({
        ...current,
        address: getAddressText(person.address) || current.address,
      }));
      setEditing(false);
      toast.success('Profile updated successfully.');
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Unable to update your profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  const fullName = [form.firstName, form.middleName, form.lastName, form.suffix]
    .filter(Boolean)
    .join(' ');

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError('');
    if (currentPassword.length < 8) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (password.length < 8) {
      setPasswordError('The new password must be at least 8 characters.');
      return;
    }
    if (password !== retypePassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    setPasswordConfirmOpen(true);
  };

  const confirmPasswordChange = async () => {
    try {
      setSavingPassword(true);
      setPasswordConfirmOpen(false);
      await updateMyPassword(currentPassword, password);
      setCurrentPassword('');
      setPassword('');
      setRetypePassword('');
      setPasswordError('');
      toast.success(
        'Password saved. You can now sign in with email and password.',
      );
    } catch (error) {
      setPasswordError(error?.response?.data?.message || 'Unable to save password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const passwordHasMinimumLength = password.length >= 8;
  const hasCurrentPassword = currentPassword.length >= 8;
  const passwordsMatch = retypePassword.length > 0 && password === retypePassword;
  const preventPasswordClipboard = (event) => event.preventDefault();

  return (
    <div className="space-y-8 px-4 py-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your account details and manage your profile.
        </p>
      </div>

      <section className="max-w-3xl rounded-xl border border-border bg-card p-6">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : editing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <ProfileHeader editing onCancel={() => setEditing(false)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                value={form.firstName}
                onChange={updateField('firstName')}
                required
              />
              <Field
                label="Last name"
                value={form.lastName}
                onChange={updateField('lastName')}
                required
              />
              <Field
                label="Middle name"
                value={form.middleName}
                onChange={updateField('middleName')}
              />
              <Field
                label="Suffix"
                value={form.suffix}
                onChange={updateField('suffix')}
              />
              <Field
                label="Contact number"
                type="tel"
                value={form.contactNo}
                onChange={staffProfile
                  ? (event) => updateField('contactNo')({
                    target: {
                      value: event.target.value.replace(/\D/g, '').slice(0, 11),
                    },
                  })
                  : updateField('contactNo')}
                placeholder="09XXXXXXXXX"
                inputMode="numeric"
                maxLength={staffProfile ? 11 : undefined}
                required={!staffProfile}
              />
              <Field
                label="Age"
                type="number"
                value={form.age}
                onChange={updateField('age')}
                required={!staffProfile}
              />
              <SelectField
                label="Gender"
                value={form.gender}
                onChange={updateField('gender')}
                required={!staffProfile}
              />
              {staffProfile ? (
                <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              ) : (
                <Detail label="Email" value={email} icon={<Mail className="h-4 w-4" />} />
              )}
            </div>
            <Field
              label="Address"
              value={form.address}
              onChange={updateField('address')}
              required={!staffProfile}
            />
            {showGuardian && <Field label="Guardian name" value={form.guardianName} onChange={updateField('guardianName')} required />}
            <div className="flex justify-end border-t border-border pt-5">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <ProfileHeader
              onEdit={() => setEditing(true)}
              locked={hasActiveEnrollment}
            />
            {hasActiveEnrollment && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Student details are locked while you have an active
                  enrollment.
                </span>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Detail label="Full name" value={fullName || 'Not provided'} />
              <Detail
                label="Email"
                value={email || 'Not available'}
                icon={<Mail className="h-4 w-4" />}
              />
              <Detail
                label="Contact number"
                value={form.contactNo || 'Not provided'}
              />
              <Detail label="Address" value={form.address || 'Not provided'} />
              <Detail label="Age" value={form.age || 'Not provided'} />
              <Detail label="Gender" value={form.gender || 'Not provided'} />
              {showGuardian && <Detail label="Guardian name" value={form.guardianName || 'Not provided'} />}
            </div>
          </div>
        )}
      </section>
      <Dialog
        open={profileConfirmOpen}
        onOpenChange={(open) => !saving && setProfileConfirmOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to save your profile?</DialogTitle>
            <DialogDescription>
              Your account details will be updated with the information you entered.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setProfileConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={confirmProfileUpdate}
            >
              {saving ? 'Saving...' : 'Yes, save profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <section className="max-w-3xl rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set or update your sign-in password. This is separate from your
          student details and remains available during an active enrollment.
        </p>
        <form
          onSubmit={handlePasswordSubmit}
          className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <input
            type="password"
            minLength={8}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            onPaste={preventPasswordClipboard}
            onCopy={preventPasswordClipboard}
            onCut={preventPasswordClipboard}
            onDrop={preventPasswordClipboard}
            onContextMenu={preventPasswordClipboard}
            autoComplete="current-password"
            aria-label="Current password"
            placeholder="Current password"
            aria-invalid={Boolean(passwordError)}
            className={`h-10 w-full rounded-md border bg-background px-3 text-sm ${passwordError ? 'border-destructive' : 'border-input'}`}
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onPaste={preventPasswordClipboard}
              onCopy={preventPasswordClipboard}
              onCut={preventPasswordClipboard}
              onDrop={preventPasswordClipboard}
              onContextMenu={preventPasswordClipboard}
              autoComplete="new-password"
              aria-label="New password"
              placeholder="New password"
              aria-invalid={Boolean(passwordError)}
              className={`h-10 w-full rounded-md border bg-background px-3 pr-10 text-sm ${passwordError ? 'border-destructive' : 'border-input'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-2 text-muted-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              value={retypePassword}
              onChange={(event) => setRetypePassword(event.target.value)}
              onPaste={preventPasswordClipboard}
              onCopy={preventPasswordClipboard}
              onCut={preventPasswordClipboard}
              onDrop={preventPasswordClipboard}
              onContextMenu={preventPasswordClipboard}
              autoComplete="new-password"
              aria-label="Retype password"
              placeholder="Retype password"
              aria-invalid={Boolean(passwordError)}
              className={`h-10 w-full rounded-md border bg-background px-3 pr-10 text-sm ${passwordError ? 'border-destructive' : 'border-input'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-2 text-muted-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </button>
          </div>
          <div className="sm:col-span-2 space-y-1 text-xs" aria-live="polite">
            {passwordError && <p className="text-destructive">{passwordError}</p>}
            <p className={password.length === 0 || passwordHasMinimumLength ? 'text-muted-foreground' : 'text-destructive'}>
              {passwordHasMinimumLength ? '✓' : '•'} Password must be at least 8 characters.
            </p>
            {retypePassword.length > 0 && (
              <p className={passwordsMatch ? 'text-green-700' : 'text-destructive'}>
                {passwordsMatch ? '✓ Passwords match.' : '• Passwords do not match.'}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={
              savingPassword || !hasCurrentPassword || !passwordHasMinimumLength || !passwordsMatch
            }
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {savingPassword ? 'Saving...' : 'Save password'}
          </button>
        </form>
      </section>
      <Dialog
        open={passwordConfirmOpen}
        onOpenChange={(open) => !savingPassword && setPasswordConfirmOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure to change your password?</DialogTitle>
            <DialogDescription>
              Your new password will be used the next time you sign in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={savingPassword}
              onClick={() => setPasswordConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={savingPassword}
              onClick={confirmPasswordChange}
            >
              {savingPassword ? 'Changing...' : 'Yes, change password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileHeader({ editing, onEdit, onCancel, locked = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Account details</h2>
          <p className="text-sm text-muted-foreground">
            {editing
              ? 'Update your personal information.'
              : 'Your personal information.'}
          </p>
        </div>
      </div>
      {editing ? (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          disabled={locked}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" />
          Edit profile
        </button>
      )}
    </div>
  );
}

function Detail({ label, value, icon }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{value || 'Not provided'}</span>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required = false, type = 'text', placeholder, inputMode, maxLength }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}

function SelectField({ label, value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Select gender</option>
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
        <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
      </select>
    </div>
  );
}
