import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDrizzleClient } from '../../db/drizzleClient';
import { contentRoles, type ContentRoleRow, type ContentRoleInsert } from '../../db/schema';
import { log } from '../../lib/logger';

export interface ContentRole {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToRole(row: ContentRoleRow): ContentRole {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    systemPrompt: row.systemPrompt,
    icon: row.icon,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class RoleService {
  async create(
    workspaceId: string,
    name: string,
    systemPrompt: string,
    description?: string,
    icon?: string
  ): Promise<ContentRole> {
    const client = await getDrizzleClient();
    const id = uuidv4();
    const now = new Date().toISOString();

    const insert: ContentRoleInsert = {
      id,
      workspaceId,
      name,
      description: description ?? null,
      systemPrompt,
      icon: icon ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await client.db.insert(contentRoles).values(insert);
    log.info(`Created content role: ${id} (${name}) for workspace: ${workspaceId}`);

    return {
      id,
      workspaceId,
      name,
      description: description ?? null,
      systemPrompt,
      icon: icon ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getById(id: string): Promise<ContentRole | null> {
    const client = await getDrizzleClient();
    const rows = await client.db.select().from(contentRoles).where(eq(contentRoles.id, id));

    if (rows.length === 0) return null;
    return rowToRole(rows[0]);
  }

  async getByWorkspaceId(workspaceId: string): Promise<ContentRole[]> {
    const client = await getDrizzleClient();
    const rows = await client.db
      .select()
      .from(contentRoles)
      .where(eq(contentRoles.workspaceId, workspaceId));

    return rows.map(rowToRole);
  }

  async update(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      systemPrompt: string;
      icon: string;
    }>
  ): Promise<ContentRole | null> {
    const client = await getDrizzleClient();
    const now = new Date().toISOString();

    const updateData: Partial<ContentRoleInsert> = {
      updatedAt: now,
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.systemPrompt !== undefined) updateData.systemPrompt = updates.systemPrompt;
    if (updates.icon !== undefined) updateData.icon = updates.icon;

    await client.db.update(contentRoles).set(updateData).where(eq(contentRoles.id, id));

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const client = await getDrizzleClient();
    await client.db.delete(contentRoles).where(eq(contentRoles.id, id));

    log.info(`Deleted content role: ${id}`);
    return true;
  }
}

export const roleService = new RoleService();
