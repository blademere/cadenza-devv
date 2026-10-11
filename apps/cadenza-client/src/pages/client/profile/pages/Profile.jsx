import { useEffect, useState } from 'react';
import { Loader2, Mail, Pencil, Save, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';

import { getMyProfile, updateMyProfile } from '../services/profile.service';

const emptyForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  phone: '',
  address: '',
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

export default function Profile() {
  const [form, setForm] = useState(emptyForm);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        const person = profile?.person || {};
        setEmail(profile?.user?.email || '');
        setForm({
          firstName: person.firstName || '',
          middleName: person.middleName || '',
          lastName: person.lastName || '',
          suffix: person.suffix || '',
          phone: person.phone || '',
          address: getAddressText(person.address),
        });
      })
      .catch(() => toast.error('Unable to load your profile.'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First name and last name are required.');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateMyProfile({
        ...form,
        address: form.address.trim() ? { line1: form.address.trim() } : null,
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

  const fullName = [
    form.firstName,
    form.middleName,
    form.lastName,
    form.suffix,
  ]
    .filter(Boolean)
    .join(' ');

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
              <Field label="First name" value={form.firstName} onChange={updateField('firstName')} required />
              <Field label="Last name" value={form.lastName} onChange={updateField('lastName')} required />
              <Field label="Middle name" value={form.middleName} onChange={updateField('middleName')} />
              <Field label="Suffix" value={form.suffix} onChange={updateField('suffix')} />
              <Field label="Phone" value={form.phone} onChange={updateField('phone')} />
              <Detail label="Email" value={email} icon={<Mail className="h-4 w-4" />} />
            </div>
            <Field label="Address" value={form.address} onChange={updateField('address')} />
            <div className="flex justify-end border-t border-border pt-5">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <ProfileHeader onEdit={() => setEditing(true)} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Detail label="Full name" value={fullName || 'Not provided'} />
              <Detail label="Email" value={email || 'Not available'} icon={<Mail className="h-4 w-4" />} />
              <Detail label="Phone" value={form.phone || 'Not provided'} />
              <Detail label="Address" value={form.address || 'Not provided'} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileHeader({ editing, onEdit, onCancel }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Account details</h2>
          <p className="text-sm text-muted-foreground">
            {editing ? 'Update your personal information.' : 'Your personal information.'}
          </p>
        </div>
      </div>
      {editing ? (
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
          <X className="h-4 w-4" />
          Cancel
        </button>
      ) : (
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
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
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{value || 'Not provided'}</span>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required = false }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        value={value}
        onChange={onChange}
        required={required}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}
