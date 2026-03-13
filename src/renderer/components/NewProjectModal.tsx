import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { SlugInput } from './ui/slug-input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Spinner } from './ui/spinner';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Upload, X } from 'lucide-react';
import { rpc } from '@/lib/rpc';

interface NewProjectModalProps {
  onClose: () => void;
  onSuccess: (projectPath: string) => void;
}

interface Owner {
  login: string;
  type: 'User' | 'Organization';
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onSuccess }) => {
  const [repoName, setRepoName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState<string>('');
  const [_owners, setOwners] = useState<Owner[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Step 2: brand upload
  const [step, setStep] = useState<'create' | 'brand'>('create');
  const [createdProjectPath, setCreatedProjectPath] = useState('');
  const [brandName, setBrandName] = useState('Brand Guidelines');
  const [brandContent, setBrandContent] = useState('');
  const [brandFileName, setBrandFileName] = useState('');
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const brandFileInputRef = useRef<HTMLInputElement>(null);

  // Load owners on mount
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const result = await window.electronAPI.githubGetOwners();
        if (cancel) return;
        if (result.success && result.owners) {
          setOwners(result.owners);
          // Set default owner to current user
          const user = result.owners.find((o) => o.type === 'User');
          if (user) {
            setOwner(user.login);
          }
        }
      } catch (error) {
        console.error('Failed to load owners:', error);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  // Reset form on mount
  useEffect(() => {
    setRepoName('');
    setDescription('');
    setIsPrivate(false);
    setError(null);
    setValidationError(null);
    setIsValidating(false);
    setProgress('');
    setTouched(false);
  }, []);

  // Validate repository name
  useEffect(() => {
    if (!repoName.trim() || !owner) {
      setValidationError(null);
      return;
    }

    // Clear existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    setIsValidating(true);
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await window.electronAPI.githubValidateRepoName(repoName.trim(), owner);
        setIsValidating(false);
        if (!result.success || !result.valid) {
          setValidationError(result.error || 'Invalid repository name');
        } else if (result.exists) {
          setValidationError(`Repository ${owner}/${repoName.trim()} already exists`);
        } else {
          setValidationError(null);
        }
      } catch (error) {
        setIsValidating(false);
        setValidationError(null); // Don't block on validation errors
      }
    }, 500); // Debounce 500ms

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [repoName, owner]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);
      setError(null);

      if (!repoName.trim()) {
        setError('Repository name is required');
        return;
      }

      if (validationError) {
        setError(validationError);
        return;
      }

      if (!owner) {
        setError('Unable to determine GitHub account. Please ensure you are authenticated.');
        return;
      }

      setIsCreating(true);
      setProgress('Creating repository on GitHub...');

      try {
        const result = await window.electronAPI.githubCreateNewProject({
          name: repoName.trim(),
          description: description.trim() || undefined,
          owner,
          isPrivate,
        });

        if (result.success && result.projectPath) {
          setProgress('Repository created successfully!');
          setCreatedProjectPath(result.projectPath);
          setIsCreating(false);
          setStep('brand');
        } else {
          let errorMessage = result.error || 'Failed to create project';
          if (result.githubRepoCreated && result.repoUrl) {
            errorMessage += `\n\nNote: The GitHub repository was created but setup failed. You can clone it manually: ${result.repoUrl}`;
          }
          setError(errorMessage);
          setProgress('');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to create project');
        setProgress('');
      } finally {
        setIsCreating(false);
      }
    },
    [repoName, description, owner, isPrivate, validationError, onSuccess, onClose]
  );

  const handleBrandFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setBrandContent(content);
    setBrandFileName(file.name);
    if (brandFileInputRef.current) brandFileInputRef.current.value = '';
  }, []);

  const handleSkipBrand = useCallback(() => {
    onSuccess(createdProjectPath);
    onClose();
  }, [createdProjectPath, onSuccess, onClose]);

  const handleSaveBrand = useCallback(async () => {
    setIsSavingBrand(true);
    try {
      // Ensure project is saved to DB first
      onSuccess(createdProjectPath);
      // Give handleNewProjectSuccess time to save the project
      await new Promise((resolve) => setTimeout(resolve, 600));
      // Find the newly created project by path
      const projects = await rpc.db.getProjects();
      const project = projects.find((p) => p.path === createdProjectPath);
      if (project) {
        const wsResult = await window.electronAPI.contentWorkspaceCreate({
          projectId: project.id,
          name: 'Default',
        });
        if (wsResult.success && wsResult.data) {
          await window.electronAPI.contentBrandCreate({
            workspaceId: wsResult.data.id,
            name: brandName.trim() || 'Brand Guidelines',
            content: brandContent,
            isActive: true,
          });
        }
      }
    } catch (err) {
      console.error('Failed to save brand:', err);
    } finally {
      setIsSavingBrand(false);
      onClose();
    }
  }, [createdProjectPath, brandName, brandContent, onSuccess, onClose]);

  return (
    <DialogContent
      className="max-w-md"
      onInteractOutside={(e) => {
        if (isCreating) e.preventDefault();
      }}
      onEscapeKeyDown={(e) => {
        if (isCreating) e.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>{step === 'brand' ? 'Add Brand Document' : 'New Project'}</DialogTitle>
      </DialogHeader>

      <Separator />

      {step === 'brand' ? (
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Optionally add a brand document to guide your agents' voice and style.
          </p>

          <div>
            <Label htmlFor="brand-name" className="mb-2 block">
              Document name
            </Label>
            <Input
              id="brand-name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Brand Guidelines"
              disabled={isSavingBrand}
            />
          </div>

          <div>
            <Label className="mb-2 block">Upload a .md file</Label>
            <input
              ref={brandFileInputRef}
              type="file"
              accept=".md,.txt,.markdown"
              className="hidden"
              onChange={handleBrandFileSelect}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => brandFileInputRef.current?.click()}
                disabled={isSavingBrand}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose file
              </Button>
              {brandFileName && (
                <div className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs">
                  <span className="max-w-[160px] truncate">{brandFileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBrandFileName('');
                      setBrandContent('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="brand-content" className="mb-2 block">
              Or paste content
            </Label>
            <Textarea
              id="brand-content"
              value={brandContent}
              onChange={(e) => setBrandContent(e.target.value)}
              placeholder="# Brand Guidelines&#10;&#10;Write your brand voice, tone, and style guidelines here..."
              rows={6}
              disabled={isSavingBrand}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipBrand}
              disabled={isSavingBrand}
            >
              Skip
            </Button>
            <Button
              type="button"
              onClick={handleSaveBrand}
              disabled={!brandContent.trim() || isSavingBrand}
            >
              {isSavingBrand ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Brand Document'
              )}
            </Button>
          </div>
        </div>
      ) : isCreating && progress ? (
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium">{progress}</p>
              <p className="text-xs text-muted-foreground">This may take a few seconds...</p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="repo-name" className="mb-2 block">
              Repository name <span className="text-destructive">*</span>
            </Label>
            <SlugInput
              id="repo-name"
              value={repoName}
              onChange={setRepoName}
              onBlur={() => setTouched(true)}
              placeholder="my-awesome-project"
              maxLength={100}
              className={`w-full ${
                touched && (error || validationError)
                  ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
              aria-invalid={touched && !!(error || validationError)}
              disabled={isCreating}
              autoFocus
            />
            {touched && (validationError || error) && (
              <div className="mt-1">
                <p className="text-xs text-destructive">{validationError || error}</p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="mb-2 block">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your project"
              disabled={isCreating}
            />
          </div>

          <div>
            <Label className="mb-2 block">Visibility</Label>
            <RadioGroup
              value={isPrivate ? 'private' : 'public'}
              onValueChange={(value: string) => setIsPrivate(value === 'private')}
              disabled={isCreating}
              className="flex items-center gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="visibility-public" />
                <Label htmlFor="visibility-public" className="cursor-pointer font-normal">
                  Public
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="visibility-private" />
                <Label htmlFor="visibility-private" className="cursor-pointer font-normal">
                  Private
                </Label>
              </div>
            </RadioGroup>
          </div>

          {error && !validationError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !!validationError || !repoName.trim() || !owner || isCreating || isValidating
              }
            >
              {isCreating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
      )}
    </DialogContent>
  );
};
