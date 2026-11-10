import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Pencil, Plus, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createDependent, getDependents, resetDependentPassword, updateDependent } from '../services/dependents.service';

const emptyForm = { username: '', password: '', confirmPassword: '', firstName: '', middleName: '', lastName: '', age: '', gender: '' };

export default function Dependents() {
  const [dependents, setDependents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function load() {
    try { setDependents(await getDependents()); } catch { toast.error('Unable to load child accounts.'); }
  }
  useEffect(() => { void load(); }, []);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 4 || age > 17) { toast.error('Children must be between 4 and 17 years old.'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match.'); return; }
    setSaving(true);
    try { const { confirmPassword, ...account } = form; await createDependent({ ...account, age }); setForm(emptyForm); setOpen(false); await load(); toast.success('Child account created.'); }
    catch (error) { toast.error(error?.response?.data?.message || 'Unable to create child account.'); }
    finally { setSaving(false); }
  }
  function openEdit(child) { setSelectedChild(child); setEditForm({ username: child.username, firstName: child.firstName, middleName: child.middleName || '', lastName: child.lastName, age: String(child.age), gender: child.gender }); setEditOpen(true); }
  async function saveEdit(event) { event.preventDefault(); setSaving(true); try { const updated = await updateDependent(selectedChild.id, { ...editForm, age: Number(editForm.age) }); setDependents((current) => current.map((item) => item.id === updated.id ? updated : item)); setEditOpen(false); toast.success('Child information updated.'); } catch (error) { toast.error(error?.response?.data?.message || 'Unable to update child information.'); } finally { setSaving(false); } }
  async function savePassword(event) { event.preventDefault(); if (resetPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; } setSaving(true); try { await resetDependentPassword(selectedChild.id, resetPassword); setResetPassword(''); setResetOpen(false); toast.success('Child password reset successfully.'); } catch (error) { toast.error(error?.response?.data?.message || 'Unable to reset child password.'); } finally { setSaving(false); } }
  return <div className="space-y-6 p-4 md:p-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-semibold">My Children</h1><p className="text-muted-foreground">Create and manage child accounts under your parent or guardian account.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add child</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add child account</DialogTitle></DialogHeader><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Username</Label><Input required value={form.username} onChange={update('username')} /></div><PasswordField label="Password" value={form.password} onChange={update('password')} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /><PasswordField label="Retype password" value={form.confirmPassword} onChange={update('confirmPassword')} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} /><div className="sm:col-span-2">{form.confirmPassword && <p className={`text-sm ${form.password === form.confirmPassword ? 'text-emerald-600' : 'text-destructive'}`}>{form.password === form.confirmPassword ? 'Passwords match.' : 'Passwords do not match.'}</p>}</div>{[['firstName','First name'],['middleName','Middle initial (optional)'],['lastName','Last name']].map(([field, label]) => <div className="space-y-2" key={field}><Label>{label}</Label><Input required={field !== 'middleName'} value={form[field]} onChange={update(field)} /></div>)}<div className="space-y-2"><Label>Age</Label><Input required type="number" min="4" max="17" value={form.age} onChange={update('age')} /></div><div className="space-y-2"><Label>Gender</Label><Select required value={form.gender} onValueChange={(value) => setForm((current) => ({ ...current, gender: value }))}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="MALE">Male</SelectItem></SelectContent></Select></div><Button type="submit" disabled={saving || !form.password || form.password !== form.confirmPassword} className="sm:col-span-2">{saving ? 'Creating...' : 'Create child account'}</Button></form></DialogContent></Dialog></div>
    {dependents.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><UsersRound className="h-10 w-10 text-muted-foreground" /><p className="font-medium">No child accounts yet</p><p className="text-sm text-muted-foreground">Add a child to manage their courses and account access.</p></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{dependents.map((child) => <Card key={child.id}><CardHeader><CardTitle>{[child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ')}</CardTitle><p className="text-sm text-muted-foreground">@{child.username} · Age {child.age} · {child.gender}</p></CardHeader><CardContent><p className="text-sm text-muted-foreground">{child.enrollments.length} course enrollment{child.enrollments.length === 1 ? '' : 's'}</p><div className="mt-4 flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => openEdit(child)}><Pencil className="mr-2 h-4 w-4" />Edit information</Button><Button type="button" variant="outline" size="sm" onClick={() => { setSelectedChild(child); setResetOpen(true); }}><KeyRound className="mr-2 h-4 w-4" />Reset password</Button></div></CardContent></Card>)}</div>}
    <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit child information</DialogTitle></DialogHeader>{editForm && <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Username</Label><Input required value={editForm.username} onChange={(event) => setEditForm((current) => ({ ...current, username: event.target.value }))} /></div>{[['firstName','First name'],['middleName','Middle initial (optional)'],['lastName','Last name']].map(([field, label]) => <div className="space-y-2" key={field}><Label>{label}</Label><Input required={field !== 'middleName'} value={editForm[field]} onChange={(event) => setEditForm((current) => ({ ...current, [field]: event.target.value }))} /></div>)}<div className="space-y-2"><Label>Age</Label><Input required type="number" min="4" max="17" value={editForm.age} onChange={(event) => setEditForm((current) => ({ ...current, age: event.target.value }))} /></div><div className="space-y-2"><Label>Gender</Label><Select required value={editForm.gender} onValueChange={(value) => setEditForm((current) => ({ ...current, gender: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="MALE">Male</SelectItem></SelectContent></Select></div><Button type="submit" disabled={saving} className="sm:col-span-2">{saving ? 'Saving...' : 'Save changes'}</Button></form>}</DialogContent></Dialog>
    <Dialog open={resetOpen} onOpenChange={setResetOpen}><DialogContent><DialogHeader><DialogTitle>Reset child password</DialogTitle></DialogHeader><form onSubmit={savePassword} className="space-y-4"><p className="text-sm text-muted-foreground">Set a new password for {selectedChild?.firstName || 'this child'}.</p><PasswordField label="New password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /><Button type="submit" disabled={saving || resetPassword.length < 8}>{saving ? 'Resetting...' : 'Reset password'}</Button></form></DialogContent></Dialog>
  </div>;
}

function PasswordField({ label, value, onChange, visible, onToggle }) {
  const Icon = visible ? EyeOff : Eye;
  return <div className="space-y-2 sm:col-span-2"><Label>{label}</Label><div className="relative"><Input required minLength={8} type={visible ? 'text' : 'password'} value={value} onChange={onChange} className="pr-10" /><button type="button" onClick={onToggle} className="absolute inset-y-0 right-3 text-muted-foreground" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}><Icon className="h-4 w-4" /></button></div></div>;
}
