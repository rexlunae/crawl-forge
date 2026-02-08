import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiKeyForm } from './api-key-form';
import { TenantForm } from './tenant-form';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's tenants
  const { data: memberships } = await supabase
    .from('tenant_members')
    .select('tenant_id, role, tenants(id, name, slug, settings)')
    .eq('user_id', user?.id);

  const tenants = memberships?.map(m => ({
    ...(m.tenants as any),
    role: m.role,
  })) ?? [];

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and workspaces</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium">User ID</label>
            <p className="text-muted-foreground font-mono text-sm">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Workspaces */}
      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>Manage your team workspaces</CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length > 0 ? (
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.slug} · {tenant.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No workspaces yet.</p>
          )}
          <div className="mt-6">
            <TenantForm />
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>LLM Configuration</CardTitle>
          <CardDescription>Configure your AI extraction providers</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyForm tenants={tenants} />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting your account will permanently remove all your data, crawlers, and extraction results.
          </p>
          <button 
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-950"
            disabled
          >
            Delete Account (coming soon)
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
