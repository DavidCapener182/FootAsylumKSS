'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createIncident } from '@/app/actions/incidents'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { shouldHideStore } from '@/lib/store-normalization'
import { incidentFormSchema, toCreateIncidentInput, type IncidentFormValues } from '@/lib/incidents/schema'

interface NewIncidentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewIncidentDialog({ open, onOpenChange }: NewIncidentDialogProps) {
  const router = useRouter()
  const [stores, setStores] = useState<Array<{ id: string; store_name: string; store_code: string | null }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStores() {
      const supabase = createClient()
      const { data } = await supabase
        .from('fa_stores')
        .select('id, store_name, store_code')
        .eq('is_active', true)
        .order('store_name')

      if (data) {
        setStores(data.filter((store) => !shouldHideStore(store)))
      }
    }
    fetchStores()
  }, [])

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      store_id: '',
      incident_category: 'other',
      severity: 'medium',
      summary: '',
      description: '',
      occurred_at: new Date().toISOString().slice(0, 16),
      riddor_reportable: '',
    },
  })

  const onSubmit = async (values: IncidentFormValues) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const incident = await createIncident(toCreateIncidentInput(values))
      form.reset()
      onOpenChange(false)
      router.push(`/incidents/${incident.id}`)
      router.refresh()
    } catch (error) {
      console.error('Failed to create incident:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to create incident. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    setSubmitError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log New Incident</DialogTitle>
          <DialogDescription>
            Report a new safety incident. Fill in all required fields and submit.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="store_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="min-h-[44px] sm:min-h-0">
                        <SelectValue placeholder="Select a store" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.store_name} {store.store_code && `(${store.store_code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="incident_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px] sm:min-h-0">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="accident">Accident</SelectItem>
                        <SelectItem value="near_miss">Near Miss</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="fire">Fire</SelectItem>
                        <SelectItem value="health_safety">Health & Safety</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px] sm:min-h-0">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brief description of the incident" className="min-h-[44px] sm:min-h-0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Detailed description of what happened" className="min-h-[120px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occurred_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occurred At *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} className="min-h-[44px] sm:min-h-0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="riddor_reportable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RIDDOR screening outcome *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="min-h-[44px] sm:min-h-0">
                        <SelectValue placeholder="Select an outcome" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yes">Potentially reportable — manager review required</SelectItem>
                      <SelectItem value="no">Not currently reportable</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Record the factual screening outcome. An authorised manager must confirm any RIDDOR decision.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError ? (
              <div role="alert" aria-live="polite" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {submitError}
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto min-h-[44px] sm:min-h-0">
                {isSubmitting ? 'Creating...' : 'Create Incident'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
