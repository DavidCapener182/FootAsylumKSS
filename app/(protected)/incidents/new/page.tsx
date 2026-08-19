'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createIncident } from '@/app/actions/incidents'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { shouldHideStore } from '@/lib/store-normalization'
import { incidentFormSchema, toCreateIncidentInput, type IncidentFormValues } from '@/lib/incidents/schema'

export default function NewIncidentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stores, setStores] = useState<Array<{ id: string; store_name: string; store_code: string | null }>>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  useEffect(() => {
    const presetStoreId = searchParams?.get('storeId')
    if (!presetStoreId) return

    if (stores.some((store) => store.id === presetStoreId)) {
      form.setValue('store_id', presetStoreId)
    }
  }, [searchParams, stores, form])

  const onSubmit = async (values: IncidentFormValues) => {
    setSubmitError(null)
    try {
      const incident = await createIncident(toCreateIncidentInput(values))
      router.push(`/incidents/${incident.id}`)
    } catch (error) {
      console.error('Failed to create incident:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to create incident. Please try again.')
    }
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-3xl">New Incident</h1>
        <p className="mt-1 hidden text-muted-foreground sm:block">Report a new incident</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
              <FormField
                control={form.control}
                name="store_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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

              <FormField
                control={form.control}
                name="incident_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                    <FormLabel>Severity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
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

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} rows={5} />
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
                    <FormLabel>Occurred At</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
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
                        <SelectTrigger>
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

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating…' : 'Create Incident'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
