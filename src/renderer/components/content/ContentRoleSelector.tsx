import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, Target, PenTool, MessageSquare, Edit3, Plus, X, User, Trash2 } from 'lucide-react';
import type { UnifiedRole } from '@/hooks/useRoles';

interface ContentRoleSelectorProps {
  roles: UnifiedRole[];
  selectedRole: string | null;
  onRoleChange: (roleId: string | null) => void;
  onCreateRole?: (name: string, systemPrompt: string, description?: string) => Promise<unknown>;
  onDeleteRole?: (id: string) => Promise<boolean>;
  disabled?: boolean;
  className?: string;
}

const BUILTIN_ICONS: Record<string, React.ReactNode> = {
  researcher: <Search className="h-3.5 w-3.5" />,
  'seo-specialist': <Target className="h-3.5 w-3.5" />,
  copywriter: <PenTool className="h-3.5 w-3.5" />,
  'brand-voice': <MessageSquare className="h-3.5 w-3.5" />,
  editor: <Edit3 className="h-3.5 w-3.5" />,
};

export function ContentRoleSelector({
  roles,
  selectedRole,
  onRoleChange,
  onCreateRole,
  onDeleteRole,
  disabled = false,
  className,
}: ContentRoleSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSystemPrompt, setNewSystemPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!onCreateRole || !newName.trim() || !newSystemPrompt.trim()) return;
    setIsCreating(true);
    try {
      await onCreateRole(
        newName.trim(),
        newSystemPrompt.trim(),
        newDescription.trim() || undefined
      );
      setNewName('');
      setNewDescription('');
      setNewSystemPrompt('');
      setShowCreate(false);
    } catch {
      // Error handled by hook
    } finally {
      setIsCreating(false);
    }
  };

  const selectedRoleObj = roles.find((r) => r.id === selectedRole);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((role) => {
          const isSelected = selectedRole === role.id;
          const icon = BUILTIN_ICONS[role.id] || <User className="h-3.5 w-3.5" />;

          return (
            <div key={role.id} className="group relative">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRoleChange(isSelected ? null : role.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
                title={role.description || role.name}
              >
                {icon}
                {role.name}
              </button>
              {!role.isBuiltin && onDeleteRole && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRole(role.id);
                    if (selectedRole === role.id) onRoleChange(null);
                  }}
                  className="absolute -right-1 -top-1 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground group-hover:block"
                  title="Delete role"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {onCreateRole && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowCreate(!showCreate)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        )}
      </div>

      {selectedRoleObj && (
        <p className="text-xs text-muted-foreground">{selectedRoleObj.description}</p>
      )}

      {showCreate && (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <Input
            placeholder="Role name (e.g., Technical Writer)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="h-7 text-xs"
          />
          <Textarea
            placeholder="System prompt — instructions for how the agent should behave in this role..."
            value={newSystemPrompt}
            onChange={(e) => setNewSystemPrompt(e.target.value)}
            className="min-h-[80px] text-xs"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={!newName.trim() || !newSystemPrompt.trim() || isCreating}
              className="h-7 text-xs"
            >
              {isCreating ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentRoleSelector;
