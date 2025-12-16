'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createAction, updateAction } from '@/app/actions/actions'

const actionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to_user_id: z.string().min(1, 'Assignee is required'),
  due_date: z.string().min(1, 'Due date is required'),
  status: z.enum(['open', 'in_progress', 'blocked', 'complete', 'cancelled']),
  evidence_required: z.boolean().default(false),
  completion_notes: z.string().optional(),
})

type ActionFormValues = z.infer<typeof actionSchema>

interface ActionFormProps {
  incidentId: string
  action?: any
  onSuccess?: () => void
}

export function ActionForm({ incidentId, action, onSuccess }: ActionFormProps) {
  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionSchema),
    defaultValues: action ? {
      title: action.title,
      description: action.description || '',
      priority: action.priority,
      assigned_to_user_id: action.assigned_to_user_id,
      due_date: action.due_date ? new Date(action.due_date).toISOString().split('T')[0] : '',
      status: action.status,
      evidence_required: action.evidence_required || false,
      completion_notes: action.completion_notes || '',
    } : {
      title: '',
      description: '',
      priority: 'medium',
      assigned_to_user_id: '',
      due_date: '',
      status: 'open',
      evidence_required: false,
      completion_notes: '',
    },
  })

  const onSubmit = async (values: ActionFormValues) => {
    try {
      if (action) {
        await updateAction(action.id, values)
      } else {
        await createAction(incidentId, values)
      }
      onSuccess?.()
      window.location.reload()
    } catch (error) {
      console.error('Failed to save action:', error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
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
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
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
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assigned_to_user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned To</FormLabel>
              <FormControl>
                <Input {...field} placeholder="User ID (will be replaced with user selector)" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('status') === 'complete' && (
          <FormField
            control={form.control}
            name="completion_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Completion Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full">
          {action ? 'Update Action' : 'Create Action'}
        </Button>
      </form>
    </Form>
  )
}

