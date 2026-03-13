import { useState, useCallback, useEffect } from 'react';
import type { ContentRole } from '@/types/electron-api';
import { CONTENT_ROLES, PROMPT_TEMPLATES } from '@shared/content/promptTemplates';

/** Unified role type that merges predefined and custom roles */
export interface UnifiedRole {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  icon: string | null;
  isBuiltin: boolean;
}

function builtinToUnified(): UnifiedRole[] {
  return CONTENT_ROLES.map((roleId) => {
    const template = PROMPT_TEMPLATES[roleId];
    return {
      id: roleId,
      name: template.name,
      description: template.description,
      systemPrompt: template.systemPrompt,
      icon: null,
      isBuiltin: true,
    };
  });
}

function customToUnified(role: ContentRole): UnifiedRole {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    systemPrompt: role.systemPrompt,
    icon: role.icon,
    isBuiltin: false,
  };
}

/**
 * Hook for managing content roles (predefined + custom).
 * Custom roles are persisted per-workspace in the DB.
 */
export function useRoles(workspaceId: string | null) {
  const [customRoles, setCustomRoles] = useState<ContentRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch custom roles when workspace changes
  useEffect(() => {
    if (!workspaceId) {
      setCustomRoles([]);
      return;
    }

    let cancelled = false;

    const fetchRoles = async () => {
      setIsLoading(true);
      try {
        const result = await window.electronAPI.contentRoleGetByWorkspace(workspaceId);
        if (!cancelled && result.success && result.data) {
          setCustomRoles(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch custom roles:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchRoles();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Merged list: builtins first, then custom
  const allRoles: UnifiedRole[] = [...builtinToUnified(), ...customRoles.map(customToUnified)];

  const createRole = useCallback(
    async (
      name: string,
      systemPrompt: string,
      description?: string,
      icon?: string
    ): Promise<ContentRole | null> => {
      if (!workspaceId) return null;
      try {
        const result = await window.electronAPI.contentRoleCreate({
          workspaceId,
          name,
          systemPrompt,
          description,
          icon,
        });
        if (result.success && result.data) {
          setCustomRoles((prev) => [...prev, result.data!]);
          return result.data;
        }
      } catch (err) {
        console.error('Failed to create custom role:', err);
      }
      return null;
    },
    [workspaceId]
  );

  const updateRole = useCallback(
    async (
      id: string,
      updates: { name?: string; description?: string; systemPrompt?: string; icon?: string }
    ): Promise<ContentRole | null> => {
      try {
        const result = await window.electronAPI.contentRoleUpdate({ id, ...updates });
        if (result.success && result.data) {
          setCustomRoles((prev) => prev.map((r) => (r.id === id ? result.data! : r)));
          return result.data;
        }
      } catch (err) {
        console.error('Failed to update custom role:', err);
      }
      return null;
    },
    []
  );

  const deleteRole = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await window.electronAPI.contentRoleDelete(id);
      if (result.success) {
        setCustomRoles((prev) => prev.filter((r) => r.id !== id));
        return true;
      }
    } catch (err) {
      console.error('Failed to delete custom role:', err);
    }
    return false;
  }, []);

  return {
    allRoles,
    customRoles,
    isLoading,
    createRole,
    updateRole,
    deleteRole,
  };
}
