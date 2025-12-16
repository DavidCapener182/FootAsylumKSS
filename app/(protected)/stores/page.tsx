import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

async function getStores() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fa_stores')
    .select('*')
    .order('store_name', { ascending: true })

  if (error) {
    console.error('Error fetching stores:', error)
    return []
  }

  return data || []
}

export default async function StoresPage() {
  await requireAuth()
  const stores = await getStores()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stores</h1>
          <p className="text-muted-foreground mt-1">Manage store locations</p>
        </div>
        <Link href="/stores/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Store
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Stores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Code</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No stores found
                    </TableCell>
                  </TableRow>
                ) : (
                  stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.store_code || '-'}</TableCell>
                      <TableCell>{store.store_name}</TableCell>
                      <TableCell>{store.city || '-'}</TableCell>
                      <TableCell>{store.region || '-'}</TableCell>
                      <TableCell>
                        <span className={store.is_active ? 'text-green-600' : 'text-gray-600'}>
                          {store.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/stores/${store.id}`}>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

