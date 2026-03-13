import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BrandEditor } from './BrandEditor';
import { CollectionList } from './CollectionList';
import { DocumentUploader } from './DocumentUploader';
import { useContentWorkspace } from '@/hooks/useContentWorkspace';
import { useBrand } from '@/hooks/useBrand';
import { useCollections } from '@/hooks/useCollections';
import { useKnowledgeDocs } from '@/hooks/useKnowledgeDocs';
import { useRoles } from '@/hooks/useRoles';
import { PROMPT_TEMPLATES, CONTENT_ROLES } from '@shared/content/promptTemplates';
import {
  Plus,
  Layers,
  FileText,
  Palette,
  FolderOpen,
  User,
  Trash2,
  PenTool,
  Search,
  Target,
  MessageSquare,
  Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabValue = 'brand' | 'knowledge' | 'roles';

interface ContentWorkspacePanelProps {
  projectId: string;
}

const BUILTIN_ICONS: Record<string, React.ReactNode> = {
  researcher: <Search className="h-4 w-4" />,
  'seo-specialist': <Target className="h-4 w-4" />,
  copywriter: <PenTool className="h-4 w-4" />,
  'brand-voice': <MessageSquare className="h-4 w-4" />,
  editor: <Edit3 className="h-4 w-4" />,
};

export function ContentWorkspacePanel({ projectId }: ContentWorkspacePanelProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [activeTab, setActiveTab] = useState<TabValue>('brand');

  const {
    workspaces,
    activeWorkspace,
    isLoading: isLoadingWorkspaces,
    createWorkspace,
    selectWorkspace,
  } = useContentWorkspace(projectId);

  const { brands, activeBrand, createBrand, updateBrand, deleteBrand, setActiveById } = useBrand(
    activeWorkspace?.id
  );

  const {
    collections,
    selectedCollection,
    createCollection,
    deleteCollection,
    selectCollection,
    incrementDocumentCount,
  } = useCollections(activeWorkspace?.id);

  const {
    documents,
    selectedDocument,
    createDocument,
    uploadDocuments,
    deleteDocument,
    selectDocument,
  } = useKnowledgeDocs(selectedCollection?.id);

  const { allRoles, createRole, deleteRole } = useRoles(activeWorkspace?.id ?? null);

  // New role form state
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePrompt, setNewRolePrompt] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    const result = await createWorkspace(newWorkspaceName.trim());
    if (result) {
      setIsCreateDialogOpen(false);
      setNewWorkspaceName('');
    }
  };

  const handleCreateDocument = async (
    name: string,
    content: string,
    metadata?: Record<string, unknown>
  ) => {
    const result = await createDocument(name, content, metadata);
    if (result && selectedCollection) {
      incrementDocumentCount(selectedCollection.id, 1);
    }
    return result;
  };

  const handleUploadDocuments = async (files: Array<{ name: string; content: string }>) => {
    const result = await uploadDocuments(files);
    if (result && selectedCollection) {
      incrementDocumentCount(selectedCollection.id, result.length);
    }
    return result;
  };

  const handleDeleteDocument = async (id: string) => {
    const result = await deleteDocument(id);
    if (result && selectedCollection) {
      incrementDocumentCount(selectedCollection.id, -1);
    }
    return result;
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !newRolePrompt.trim()) return;
    setIsCreatingRole(true);
    try {
      await createRole(
        newRoleName.trim(),
        newRolePrompt.trim(),
        newRoleDescription.trim() || undefined
      );
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRolePrompt('');
      setShowNewRoleForm(false);
    } finally {
      setIsCreatingRole(false);
    }
  };

  if (isLoadingWorkspaces) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // No workspaces yet - show create prompt
  if (workspaces.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <Layers className="h-16 w-16 text-muted-foreground/50" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Content Workspaces</h3>
          <p className="text-sm text-muted-foreground">
            Create a workspace to start managing your content.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Content Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWorkspace();
                }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkspace}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Workspace selector */}
      <div className="flex items-center gap-2 border-b p-4">
        <Layers className="h-5 w-5 text-muted-foreground" />
        <select
          value={activeWorkspace?.id || ''}
          onChange={(e) => {
            const workspace = workspaces.find((w) => w.id === e.target.value);
            selectWorkspace(workspace || null);
          }}
          className="flex-1 rounded border bg-transparent px-2 py-1"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Content Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWorkspace();
                }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkspace}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workspace content */}
      {activeWorkspace && (
        <div className="flex flex-1 flex-col">
          {/* Tab buttons */}
          <div className="mx-4 mt-4 inline-flex h-10 w-fit items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            <button
              onClick={() => setActiveTab('brand')}
              className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                activeTab === 'brand'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:bg-background/50'
              )}
            >
              <Palette className="h-4 w-4" />
              Brand
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                activeTab === 'knowledge'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:bg-background/50'
              )}
            >
              <FolderOpen className="h-4 w-4" />
              Knowledge
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                activeTab === 'roles'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:bg-background/50'
              )}
            >
              <User className="h-4 w-4" />
              Roles
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'brand' && (
            <div className="flex-1 overflow-auto p-4">
              <BrandEditor
                brands={brands}
                activeBrand={activeBrand}
                onCreateBrand={createBrand}
                onUpdateBrand={updateBrand}
                onDeleteBrand={deleteBrand}
                onSetActive={setActiveById}
              />
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="grid h-full grid-cols-2 gap-6">
                <div>
                  <CollectionList
                    collections={collections}
                    selectedCollection={selectedCollection}
                    onSelectCollection={selectCollection}
                    onCreateCollection={createCollection}
                    onDeleteCollection={deleteCollection}
                  />
                </div>
                <div>
                  {selectedCollection ? (
                    <DocumentUploader
                      collectionId={selectedCollection.id}
                      documents={documents}
                      onCreateDocument={handleCreateDocument}
                      onUploadDocuments={handleUploadDocuments}
                      onDeleteDocument={handleDeleteDocument}
                      onSelectDocument={selectDocument}
                      selectedDocument={selectedDocument}
                    />
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                      <FileText className="mb-2 h-12 w-12 opacity-50" />
                      <p>Select a collection to view documents</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-6">
                {/* Predefined roles */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground">Built-in Roles</h4>
                  <div className="space-y-2">
                    {CONTENT_ROLES.map((roleId) => {
                      const template = PROMPT_TEMPLATES[roleId];
                      const icon = BUILTIN_ICONS[roleId] || <User className="h-4 w-4" />;
                      return (
                        <div key={roleId} className="flex items-start gap-3 rounded-md border p-3">
                          <div className="mt-0.5 text-muted-foreground">{icon}</div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{template.name}</div>
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                          </div>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            built-in
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom roles */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">Custom Roles</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewRoleForm(!showNewRoleForm)}
                      className="h-7 gap-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Role
                    </Button>
                  </div>

                  {showNewRoleForm && (
                    <div className="mb-4 space-y-3 rounded-md border border-dashed p-4">
                      <Input
                        placeholder="Role name (e.g., Technical Writer)"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Description (optional)"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        className="text-sm"
                      />
                      <Textarea
                        placeholder="System prompt — detailed instructions for how the agent should behave in this role..."
                        value={newRolePrompt}
                        onChange={(e) => setNewRolePrompt(e.target.value)}
                        className="min-h-[120px] text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowNewRoleForm(false);
                            setNewRoleName('');
                            setNewRoleDescription('');
                            setNewRolePrompt('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCreateRole}
                          disabled={!newRoleName.trim() || !newRolePrompt.trim() || isCreatingRole}
                        >
                          {isCreatingRole ? 'Creating...' : 'Create Role'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {allRoles.filter((r) => !r.isBuiltin).length === 0 && !showNewRoleForm ? (
                    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-muted-foreground">
                      <User className="mb-2 h-8 w-8 opacity-50" />
                      <p className="text-sm">No custom roles yet</p>
                      <p className="text-xs">
                        Create a role to customize how agents approach your content.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allRoles
                        .filter((r) => !r.isBuiltin)
                        .map((role) => (
                          <div
                            key={role.id}
                            className="group flex items-start gap-3 rounded-md border p-3"
                          >
                            <div className="mt-0.5 text-muted-foreground">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{role.name}</div>
                              {role.description && (
                                <p className="text-xs text-muted-foreground">{role.description}</p>
                              )}
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/70">
                                {role.systemPrompt.slice(0, 120)}
                                {role.systemPrompt.length > 120 ? '...' : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteRole(role.id)}
                              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                              title="Delete role"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
