import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Separator } from '../../../components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'

export default function LessonEnrollmentPanel({ lessonPackages = [], onContinue }) {
  const [packageId, setPackageId] = useState('')
  const selected = lessonPackages.find((pkg) => pkg.id === packageId)
  return <Card><CardHeader><CardTitle className="text-base">Enroll student</CardTitle><p className="text-sm text-muted-foreground">Select a lesson package. Enrollment creates a full-payment obligation.</p></CardHeader><CardContent className="grid gap-4"><Select value={packageId} onValueChange={setPackageId}><SelectTrigger className="w-full"><SelectValue placeholder="Choose a package" /></SelectTrigger><SelectContent>{lessonPackages.map((pkg) => <SelectItem key={pkg.id} value={String(pkg.id)}>{pkg.name}</SelectItem>)}</SelectContent></Select>{selected && <><Separator /><div className="flex items-center justify-between"><span>{selected.numberOfSessions} sessions</span><span className="font-bold">₱{Number(selected.price).toLocaleString()}</span></div><Button className="w-full" onClick={() => onContinue?.(selected)}>Continue to enrollment</Button></>}</CardContent></Card>
}
